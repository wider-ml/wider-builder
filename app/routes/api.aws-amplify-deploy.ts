import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
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

    /*
     * For now, we'll simulate the deployment process
     * In a real implementation, you would use the AWS SDK or AWS CLI
     * This is a simplified version that demonstrates the flow
     */

    let targetAppId = appId;
    let appInfo: AWSAmplifyAppInfo | undefined;

    // Detect framework from the source files if not provided
    let detectedFramework = framework;

    if (!detectedFramework && sourceFiles) {
      detectedFramework = detectFramework(sourceFiles);
      console.log('Detected framework from source files:', detectedFramework);
    }

    // Generate a mock app ID if none provided
    if (!targetAppId) {
      targetAppId = `d${Math.random().toString(36).substring(2, 15)}`;

      const appName = `bolt-diy-${chatId}-${Date.now()}`;

      appInfo = {
        appId: targetAppId,
        name: appName,
        url: `https://${targetAppId}.amplifyapp.com`,
        chatId,
      };
    } else {
      appInfo = {
        appId: targetAppId,
        name: `bolt-diy-${chatId}`,
        url: `https://${targetAppId}.amplifyapp.com`,
        chatId,
      };
    }

    // Create a ZIP file with the build files (for demonstration)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add files to ZIP
    for (const [filePath, content] of Object.entries(files)) {
      // Ensure file path doesn't start with a slash
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      zip.file(normalizedPath, content);
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // Simulate deployment job creation
    const jobId = `j${Math.random().toString(36).substring(2, 15)}`;

    /*
     * In a real implementation, you would:
     * 1. Use AWS SDK to create/update Amplify app
     * 2. Upload the ZIP file to S3
     * 3. Start a deployment job
     * 4. Return the job ID for status tracking
     */

    console.log(`Simulating AWS Amplify deployment for app ${targetAppId} with ${Object.keys(files).length} files`);

    return json({
      success: true,
      deployment: {
        jobId,
        status: 'PENDING',
      },
      app: appInfo,
    });
  } catch (error) {
    console.error('AWS Amplify deploy error:', error);
    return json({ error: 'Deployment failed' }, { status: 500 });
  }
}
