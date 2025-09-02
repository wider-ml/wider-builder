import { json } from '@remix-run/node';
import { execSync } from 'child_process';

export async function loader() {
  try {
    console.log('=== Environment Test ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'PRESENT' : 'MISSING');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('API_ROOT_URL:', process.env.API_ROOT_URL);
    console.log('WIDER_APP_URL:', process.env.WIDER_APP_URL);
    console.log('All env keys count:', Object.keys(process.env).length);
    console.log(
      'All AWS keys:',
      Object.keys(process.env).filter((k) => k.includes('AWS')),
    );
    console.log('Process PID:', process.pid);

    // Fallback environment variable reading using execSync
    const fallbackEnvVars: Record<string, string> = {};
    const fallbackAwsKeys: string[] = [];
    let fallbackEnvKeysCount = 0;

    try {
      console.log('=== Fallback Environment Check ===');

      const envOutput = execSync('printenv', { encoding: 'utf8' });
      const envLines = envOutput.split('\n');

      for (const line of envLines) {
        if (line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');

          if (key && value) {
            fallbackEnvVars[key] = value;

            if (key.includes('AWS')) {
              fallbackAwsKeys.push(key);
            }
          }
        }
      }

      fallbackEnvKeysCount = Object.keys(fallbackEnvVars).length;

      console.log('Fallback NODE_ENV:', fallbackEnvVars.NODE_ENV);
      console.log(
        'Fallback AWS_ACCESS_KEY_ID:',
        fallbackEnvVars.AWS_ACCESS_KEY_ID ? `${fallbackEnvVars.AWS_ACCESS_KEY_ID.substring(0, 4)}****` : 'undefined',
      );
      console.log('Fallback AWS_SECRET_ACCESS_KEY:', fallbackEnvVars.AWS_SECRET_ACCESS_KEY ? 'PRESENT' : 'MISSING');
      console.log('Fallback AWS_REGION:', fallbackEnvVars.AWS_REGION);
      console.log('Fallback API_ROOT_URL:', fallbackEnvVars.API_ROOT_URL);
      console.log('Fallback WIDER_APP_URL:', fallbackEnvVars.WIDER_APP_URL);
      console.log('Fallback env keys count:', fallbackEnvKeysCount);
      console.log('Fallback AWS keys:', fallbackAwsKeys);
      console.log('=== End Fallback Environment Check ===');
    } catch (execError) {
      console.error('Error executing printenv:', execError);
    }

    console.log('=== End Environment Test ===');

    return json({
      nodeEnv: process.env.NODE_ENV,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'PRESENT' : 'MISSING',
      awsRegion: process.env.AWS_REGION,
      apiRootUrl: process.env.API_ROOT_URL,
      widerAppUrl: process.env.WIDER_APP_URL,
      allEnvKeysCount: Object.keys(process.env).length,
      awsKeys: Object.keys(process.env).filter((k) => k.includes('AWS')),
      processPid: process.pid,

      // Add fallback data
      fallback: {
        nodeEnv: fallbackEnvVars.NODE_ENV,
        awsAccessKeyId: fallbackEnvVars.AWS_ACCESS_KEY_ID
          ? `${fallbackEnvVars.AWS_ACCESS_KEY_ID.substring(0, 4)}****`
          : undefined,
        awsSecretAccessKey: fallbackEnvVars.AWS_SECRET_ACCESS_KEY ? 'PRESENT' : 'MISSING',
        awsRegion: fallbackEnvVars.AWS_REGION,
        apiRootUrl: fallbackEnvVars.API_ROOT_URL,
        widerAppUrl: fallbackEnvVars.WIDER_APP_URL,
        allEnvKeysCount: fallbackEnvKeysCount,
        awsKeys: fallbackAwsKeys,
      },
    });
  } catch (error) {
    console.error('Error in test-env:', error);
    return json({ error: 'Failed to check environment' }, { status: 500 });
  }
}
