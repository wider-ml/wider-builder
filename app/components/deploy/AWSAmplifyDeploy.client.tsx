import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { awsConnection, checkAWSCredentials } from '~/lib/stores/aws';
import { workbenchStore } from '~/lib/stores/workbench';
import { webcontainer } from '~/lib/webcontainer';
import { path } from '~/utils/path';
import { useState, useEffect } from 'react';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { chatId } from '~/lib/persistence/useChatHistory';

export function useAWSAmplifyDeploy() {
  const [isDeploying, setIsDeploying] = useState(false);
  const awsConn = useStore(awsConnection);
  const currentChatId = useStore(chatId);

  // Check for AWS credentials on component mount
  useEffect(() => {
    checkAWSCredentials();
  }, []);

  const handleAWSAmplifyDeploy = async () => {
    // Check if AWS credentials are available (either from env or connection)
    const hasCredentials = await checkAWSCredentials();

    if (!hasCredentials) {
      toast.error(
        'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in your .env file.',
      );
      return false;
    }

    if (!currentChatId) {
      toast.error('No active chat found');
      return false;
    }

    try {
      setIsDeploying(true);

      const artifact = workbenchStore.firstArtifact;

      if (!artifact) {
        throw new Error('No active project found');
      }

      // Create a deployment artifact for visual feedback
      const deploymentId = `deploy-aws-amplify`;
      workbenchStore.addArtifact({
        id: deploymentId,
        messageId: deploymentId,
        title: 'AWS Amplify Deployment',
        type: 'standalone',
      });

      const deployArtifact = workbenchStore.artifacts.get()[deploymentId];

      // Notify that build is starting
      deployArtifact.runner.handleDeployAction('building', 'running', { source: 'aws-amplify' });

      // Set up build action
      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'aws amplify build',
        artifactId: artifact.id,
        actionId,
        action: {
          type: 'build' as const,
          content: 'npm run build',
        },
      };

      // Add the action first
      artifact.runner.addAction(actionData);

      // Then run it
      await artifact.runner.runAction(actionData);

      if (!artifact.runner.buildOutput) {
        // Notify that build failed
        deployArtifact.runner.handleDeployAction('building', 'failed', {
          error: 'Build failed. Check the terminal for details.',
          source: 'aws-amplify',
        });
        throw new Error('Build failed');
      }

      // Notify that build succeeded and deployment is starting
      deployArtifact.runner.handleDeployAction('deploying', 'running', { source: 'aws-amplify' });

      // Get the build files
      const container = await webcontainer;

      // Remove /home/project from buildPath if it exists
      const buildPath = artifact.runner.buildOutput.path.replace('/home/project', '');

      console.log('Original buildPath', buildPath);

      // Check if the build path exists
      let finalBuildPath = buildPath;

      // List of common output directories to check if the specified build path doesn't exist
      const commonOutputDirs = [buildPath, '/dist', '/build', '/out', '/output', '/.next', '/public'];

      // Verify the build path exists, or try to find an alternative
      let buildPathExists = false;

      for (const dir of commonOutputDirs) {
        try {
          await container.fs.readdir(dir);
          finalBuildPath = dir;
          buildPathExists = true;
          console.log(`Using build directory: ${finalBuildPath}`);
          break;
        } catch (error) {
          // Directory doesn't exist, try the next one
          console.log(`Directory ${dir} doesn't exist, trying next option. ${error}`);
          continue;
        }
      }

      if (!buildPathExists) {
        throw new Error('Could not find build output directory. Please check your build configuration.');
      }

      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isFile()) {
            const content = await container.fs.readFile(fullPath, 'utf-8');

            // Remove build path prefix from the path
            const deployPath = fullPath.replace(finalBuildPath, '');
            files[deployPath] = content;
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }

        return files;
      }

      const fileContents = await getAllFiles(finalBuildPath);

      // Get all source project files for framework detection
      const allProjectFiles: Record<string, string> = {};

      async function getAllProjectFiles(dirPath: string): Promise<void> {
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isFile()) {
            try {
              const content = await container.fs.readFile(fullPath, 'utf-8');

              // Store with relative path from project root
              let relativePath = fullPath;

              if (fullPath.startsWith('/home/project/')) {
                relativePath = fullPath.replace('/home/project/', '');
              } else if (fullPath.startsWith('./')) {
                relativePath = fullPath.replace('./', '');
              }

              allProjectFiles[relativePath] = content;
            } catch (error) {
              // Skip binary files or files that can't be read as text
              console.log(`Skipping file ${entry.name}: ${error}`);
            }
          } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await getAllProjectFiles(fullPath);
          }
        }
      }

      // Try to read from the current directory first
      try {
        await getAllProjectFiles('.');
      } catch {
        // Fallback to /home/project if current directory doesn't work
        await getAllProjectFiles('/home/project');
      }

      // Use chatId instead of artifact.id
      const existingAppId = localStorage.getItem(`aws-amplify-app-${currentChatId}`);

      const response = await fetch('/api/aws-amplify-deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: existingAppId || undefined,
          files: fileContents,
          sourceFiles: allProjectFiles,
          chatId: currentChatId,
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.deployment || !data.app) {
        console.error('Invalid deploy response:', data);

        // Notify that deployment failed
        deployArtifact.runner.handleDeployAction('deploying', 'failed', {
          error: data.error || 'Invalid deployment response',
          source: 'aws-amplify',
        });
        throw new Error(data.error || 'Invalid deployment response');
      }

      const maxAttempts = 30; // 5 minutes timeout
      let attempts = 0;
      let deploymentStatus;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await fetch('/api/aws-amplify-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appId: data.app.appId,
              jobId: data.deployment.jobId,
            }),
          });

          if (statusResponse.ok) {
            deploymentStatus = (await statusResponse.json()) as any;

            if (deploymentStatus.status === 'SUCCEED') {
              break;
            }

            if (deploymentStatus.status === 'FAILED' || deploymentStatus.status === 'CANCELLED') {
              // Notify that deployment failed
              deployArtifact.runner.handleDeployAction('deploying', 'failed', {
                error: 'Deployment failed: ' + (deploymentStatus.statusReason || 'Unknown error'),
                source: 'aws-amplify',
              });
              throw new Error('Deployment failed: ' + (deploymentStatus.statusReason || 'Unknown error'));
            }
          }

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds between checks
        } catch (error) {
          console.error('Status check error:', error);
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }

      if (attempts >= maxAttempts) {
        // Notify that deployment timed out
        deployArtifact.runner.handleDeployAction('deploying', 'failed', {
          error: 'Deployment timed out',
          source: 'aws-amplify',
        });
        throw new Error('Deployment timed out');
      }

      // Store the app ID if it's a new app
      if (data.app) {
        localStorage.setItem(`aws-amplify-app-${currentChatId}`, data.app.appId);
      }

      // Notify that deployment completed successfully
      deployArtifact.runner.handleDeployAction('complete', 'complete', {
        url: data.app.url || `https://${data.app.appId}.amplifyapp.com`,
        source: 'aws-amplify',
      });

      return true;
    } catch (error) {
      console.error('AWS Amplify deploy error:', error);
      toast.error(error instanceof Error ? error.message : 'AWS Amplify deployment failed');

      return false;
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    isDeploying,
    handleAWSAmplifyDeploy,
    isConnected: !!(awsConn.accessKeyId && awsConn.secretAccessKey),
  };
}
