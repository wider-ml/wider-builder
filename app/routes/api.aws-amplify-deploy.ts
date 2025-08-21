/* eslint-disable @typescript-eslint/naming-convention */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import {
  AmplifyClient,
  CreateAppCommand,
  StartDeploymentCommand,
  GetAppCommand,
  CreateDomainAssociationCommand,
  Platform,
} from '@aws-sdk/client-amplify';
import type { AWSAmplifyAppInfo } from '~/types/aws';

// Function to detect framework from project files
const detectFramework = (files: Record<string, string>): string => {
  // Check for package.json first
  const packageJson = files['package.json'];

  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

      // Check for specific frameworks
      if (dependencies.next) {
        return 'nextjs';
      }

      if (dependencies.react && dependencies['@remix-run/react']) {
        return 'remix';
      }

      if (dependencies.react && dependencies.vite) {
        return 'vite';
      }

      if (dependencies.react && dependencies['@vitejs/plugin-react']) {
        return 'vite';
      }

      if (dependencies.react && dependencies.vue) {
        return 'vue';
      }

      if (dependencies.react && dependencies['@sveltejs/kit']) {
        return 'sveltekit';
      }

      if (dependencies.react && dependencies.astro) {
        return 'astro';
      }

      if (dependencies.react && dependencies['@angular/core']) {
        return 'angular';
      }

      // Generic React app
      if (dependencies.react) {
        return 'react';
      }

      // Check for other frameworks
      if (dependencies['@angular/core']) {
        return 'angular';
      }

      if (dependencies.vue) {
        return 'vue';
      }

      if (dependencies['@sveltejs/kit']) {
        return 'sveltekit';
      }

      if (dependencies.astro) {
        return 'astro';
      }

      // Check for build tools
      if (dependencies.vite) {
        return 'vite';
      }

      // Default to Node.js if package.json exists
      return 'nodejs';
    } catch (error) {
      console.error('Error parsing package.json:', error);
    }
  }

  // Check for other framework indicators
  if (files['next.config.js'] || files['next.config.ts']) {
    return 'nextjs';
  }

  if (files['remix.config.js'] || files['remix.config.ts']) {
    return 'remix';
  }

  if (files['vite.config.js'] || files['vite.config.ts']) {
    return 'vite';
  }

  if (files['svelte.config.js'] || files['svelte.config.ts']) {
    return 'sveltekit';
  }

  if (files['astro.config.js'] || files['astro.config.ts']) {
    return 'astro';
  }

  if (files['angular.json']) {
    return 'angular';
  }

  if (files['vue.config.js'] || files['vue.config.ts']) {
    return 'vue';
  }

  // Check for static site indicators
  if (files['index.html']) {
    return 'static';
  }

  // Default to unknown
  return 'other';
};

interface DeployRequestBody {
  appId?: string;
  files: Record<string, string>;
  sourceFiles?: Record<string, string>;
  chatId: string;
  framework?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { appId, files, sourceFiles, chatId, framework } = (await request.json()) as DeployRequestBody;

    // Get AWS credentials from environment variables
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      return json({ error: 'AWS credentials not configured in environment variables' }, { status: 401 });
    }

    // Initialize AWS client
    const amplifyClient = new AmplifyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    let targetAppId = appId;
    let appInfo: AWSAmplifyAppInfo | undefined;

    // Detect framework from the files if not provided
    let detectedFramework = framework;

    if (!detectedFramework && files) {
      detectedFramework = detectFramework(files);
      console.log('Detected framework from files:', detectedFramework);
    }

    // Map framework to Amplify platform
    const getPlatform = (framework: string): Platform => {
      switch (framework) {
        case 'nextjs':
          return Platform.WEB;
        case 'react':
        case 'vite':
          return Platform.WEB;
        case 'vue':
          return Platform.WEB;
        case 'angular':
          return Platform.WEB;
        case 'static':
          return Platform.WEB;
        default:
          return Platform.WEB;
      }
    };

    // Get build settings based on framework
    const getBuildSettings = (framework: string) => {
      const buildSettings: Record<string, any> = {
        nextjs: {
          commands: {
            preBuild: 'npm ci',
            build: 'npm run build',
          },
        },
        react: {
          commands: {
            preBuild: 'npm ci',
            build: 'npm run build',
          },
        },
        vite: {
          commands: {
            preBuild: 'npm ci',
            build: 'npm run build',
          },
        },
        vue: {
          commands: {
            preBuild: 'npm ci',
            build: 'npm run build',
          },
        },
        angular: {
          commands: {
            preBuild: 'npm ci',
            build: 'npm run build',
          },
        },
        static: {
          commands: {
            build: 'echo "No build required for static site"',
          },
        },
      };

      return buildSettings[framework] || buildSettings.static;
    };

    // Create or get existing Amplify app
    if (!targetAppId) {
      const appName = `wider-web-${chatId}-${Date.now()}`;
      console.log(`Creating new Amplify app with name: ${appName}`);

      try {
        const createAppCommand = new CreateAppCommand({
          name: appName,
          description: `Deployed from Wider Builder - Chat ${chatId}`,
          platform: getPlatform(detectedFramework || 'static'),
          buildSpec: JSON.stringify({
            version: '1.0',
            frontend: {
              phases: getBuildSettings(detectedFramework || 'static'),
              artifacts: {
                baseDirectory:
                  detectedFramework === 'nextjs'
                    ? '.next'
                    : detectedFramework === 'vite'
                      ? 'dist'
                      : detectedFramework === 'react'
                        ? 'build'
                        : detectedFramework === 'vue'
                          ? 'dist'
                          : detectedFramework === 'angular'
                            ? 'dist'
                            : '.',
                files: ['**/*'],
              },
            },
          }),
        });

        const createAppResponse = await amplifyClient.send(createAppCommand);
        targetAppId = createAppResponse.app?.appId;
        console.log(`Created Amplify app with ID: ${targetAppId}`);

        if (!targetAppId) {
          throw new Error('Failed to create Amplify app - no app ID returned');
        }

        appInfo = {
          appId: targetAppId,
          name: appName,
          url: `https://${createAppResponse.app?.defaultDomain}`,
          chatId,
        };

        console.log(`Created new Amplify app: ${targetAppId}`);
      } catch (error) {
        console.error('Error creating Amplify app:', error);
        throw new Error(`Failed to create Amplify app: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Get existing app info
      console.log(`Using existing Amplify app ID: ${targetAppId}`);

      try {
        const getAppCommand = new GetAppCommand({ appId: targetAppId });
        const getAppResponse = await amplifyClient.send(getAppCommand);

        appInfo = {
          appId: targetAppId,
          name: getAppResponse.app?.name || `bolt-diy-${chatId}`,
          url: `https://${getAppResponse.app?.defaultDomain}`,
          chatId,
        };

        console.log(`Using existing Amplify app: ${targetAppId}`);
      } catch (error) {
        console.error('Else catch: ---- Error getting Amplify app:', error);
        throw new Error(`Failed to get Amplify app: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Use files for deployment
    const filesToDeploy = files;

    if (!filesToDeploy || Object.keys(filesToDeploy).length === 0) {
      throw new Error('No source files provided for deployment');
    }

    console.log(`Deploying ${Object.keys(filesToDeploy).length} source files`);

    // Create a branch if it doesn't exist
    try {
      const { CreateBranchCommand, GetBranchCommand } = await import('@aws-sdk/client-amplify');

      // Check if main branch exists
      try {
        const getBranchCommand = new GetBranchCommand({
          appId: targetAppId,
          branchName: 'main',
        });
        await amplifyClient.send(getBranchCommand);
        console.log('Main branch already exists');
      } catch (branchError) {
        console.log(branchError);

        // Branch doesn't exist, create it
        console.log('Creating main branch...');

        const createBranchCommand = new CreateBranchCommand({
          appId: targetAppId,
          branchName: 'main',
          description: 'Main deployment branch',
          enableAutoBuild: false,
          enableBasicAuth: false,
        });
        await amplifyClient.send(createBranchCommand);
        console.log('Created main branch');
      }
    } catch (error) {
      console.error('Error managing branch:', error);

      // Continue with deployment even if branch management fails
    }

    // Use CreateDeployment with direct file upload (no S3 needed)
    try {
      console.log('Creating deployment using CreateDeployment...');

      // Import crypto for MD5 hashing
      const crypto = await import('crypto');

      // Create fileMap with MD5 hashes
      const fileMap: Record<string, string> = {};

      for (const [filePath, content] of Object.entries(filesToDeploy)) {
        const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        const md5Hash = crypto.createHash('md5').update(content, 'utf8').digest('hex');
        fileMap[normalizedPath] = md5Hash;
      }

      const { CreateDeploymentCommand } = await import('@aws-sdk/client-amplify');
      const createDeploymentCommand = new CreateDeploymentCommand({
        appId: targetAppId,
        branchName: 'main',
        fileMap,
      });

      const createDeploymentResponse = await amplifyClient.send(createDeploymentCommand);
      const jobId = createDeploymentResponse.jobId;
      const uploadUrls = createDeploymentResponse.fileUploadUrls;

      if (!jobId) {
        throw new Error('Failed to create deployment - no job ID returned');
      }

      console.log(`Created deployment with job ID: ${jobId}`);
      console.log(`Received ${Object.keys(uploadUrls || {}).length} upload URLs`);

      // Upload files to the provided URLs
      if (uploadUrls) {
        for (const [filePath, uploadUrl] of Object.entries(uploadUrls)) {
          const fileContent = filesToDeploy[filePath] || filesToDeploy[`/${filePath}`];

          if (fileContent) {
            try {
              const response = await fetch(uploadUrl, {
                method: 'PUT',
                body: fileContent,
                headers: {
                  'Content-Type': 'application/octet-stream',
                },
              });

              if (!response.ok) {
                throw new Error(`Failed to upload ${filePath}: ${response.statusText}`);
              }

              console.log(`Successfully uploaded: ${filePath}`);
            } catch (uploadError) {
              console.error(`Error uploading ${filePath}:`, uploadError);
              throw new Error(
                `Failed to upload file ${filePath}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
              );
            }
          }
        }
      }

      // After files are uploaded, start the deployment
      console.log(`Starting deployment for job ID: ${jobId}`);

      const startDeploymentCommand = new StartDeploymentCommand({
        appId: targetAppId,
        branchName: 'main',
        jobId,
      });

      await amplifyClient.send(startDeploymentCommand);
      console.log(`Started deployment successfully for job ID: ${jobId}`);

      // Create custom domain association
      const customDomain = `${targetAppId}.widerml.site`;
      let domainAssociationStatus = null;

      try {
        console.log(`Creating domain association for: ${customDomain}`);

        const createDomainCommand = new CreateDomainAssociationCommand({
          appId: targetAppId,
          domainName: customDomain,
          subDomainSettings: [
            {
              prefix: '',
              branchName: 'main',
            },
          ],
          enableAutoSubDomain: false,
        });

        const domainResponse = await amplifyClient.send(createDomainCommand);
        domainAssociationStatus = domainResponse.domainAssociation?.domainStatus;

        console.log(`Domain association created for ${customDomain} with status: ${domainAssociationStatus}`);

        // Update app info with custom domain
        if (appInfo) {
          appInfo.url = `https://${customDomain}`;
          appInfo.customDomain = customDomain;
        }
      } catch (domainError) {
        console.warn('Failed to create domain association:', domainError);

        // Continue without failing the deployment
        domainAssociationStatus = 'FAILED';
      }

      return json({
        success: true,
        deployment: {
          jobId,
          status: 'RUNNING',
        },
        app: appInfo,
        domain: {
          customDomain,
          status: domainAssociationStatus,
          note:
            domainAssociationStatus === 'FAILED'
              ? 'Domain association failed, but deployment is proceeding. You can manually configure the domain in AWS Amplify console.'
              : 'Custom domain configured successfully. DNS propagation may take a few minutes.',
        },
        message: 'Deployment created, files uploaded, and deployment started successfully.',
      });
    } catch (error) {
      console.error('Error with CreateDeployment method:', error);
      throw new Error(`Failed to create deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('AWS Amplify deploy error:', error);
    return json({ error: 'Deployment failed' }, { status: 500 });
  }
}
