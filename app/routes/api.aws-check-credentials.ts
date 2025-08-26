import { json } from '@remix-run/node';
import { execSync } from 'child_process';

export async function loader({ request, context }: { request: Request; context: any }) {
  try {
    // Try multiple approaches to get environment variables
    let accessKeyId = context?.cloudflare?.env?.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    let secretAccessKey = context?.cloudflare?.env?.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    let region = context?.cloudflare?.env?.AWS_REGION || process.env.AWS_REGION || 'us-east-1';

    console.log('Initial AWS Env Vars:', {
      accessKeyId: accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'undefined',
      secretAccessKey: secretAccessKey ? `${secretAccessKey.substring(0, 8)}...` : 'undefined',
      region,
    });

    // If process.env doesn't work, try using child process to get env vars
    if (!accessKeyId || !secretAccessKey) {
      try {
        const envOutput = execSync('printenv', { encoding: 'utf8' });
        const envLines = envOutput.split('\n');

        for (const line of envLines) {
          if (line.startsWith('AWS_ACCESS_KEY_ID=')) {
            accessKeyId = line.split('=')[1];
          } else if (line.startsWith('AWS_SECRET_ACCESS_KEY=')) {
            secretAccessKey = line.split('=')[1];
          } else if (line.startsWith('AWS_REGION=')) {
            region = line.split('=')[1];
          }
        }
      } catch (execError) {
        console.error('Error executing printenv:', execError);
      }
    }

    // Check if AWS credentials are available
    const hasCredentials = !!(accessKeyId && secretAccessKey);

    console.log('AWS Credentials Check:', {
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      accessKeyId: accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'undefined',
      secretAccessKey: secretAccessKey ? `${secretAccessKey.substring(0, 8)}...` : 'undefined',
      region,
      hasCredentials,
      processEnvKeys: Object.keys(process.env).filter((key) => key.includes('AWS')),
      processEnvCount: Object.keys(process.env).length,
    });

    return json({
      hasCredentials,
      region,
    });
  } catch (error) {
    console.error('Error checking AWS credentials:', error);
    return json({
      hasCredentials: false,
      region: 'us-east-1',
    });
  }
}
