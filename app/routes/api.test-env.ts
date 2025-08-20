import { json } from '@remix-run/node';

export async function loader() {
  try {
    console.log('=== Environment Test ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'PRESENT' : 'MISSING');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('All env keys count:', Object.keys(process.env).length);
    console.log(
      'All AWS keys:',
      Object.keys(process.env).filter((k) => k.includes('AWS')),
    );
    console.log('Process PID:', process.pid);
    console.log('=== End Environment Test ===');

    return json({
      nodeEnv: process.env.NODE_ENV,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'PRESENT' : 'MISSING',
      awsRegion: process.env.AWS_REGION,
      allEnvKeysCount: Object.keys(process.env).length,
      awsKeys: Object.keys(process.env).filter((k) => k.includes('AWS')),
      processPid: process.pid,
    });
  } catch (error) {
    console.error('Error in test-env:', error);
    return json({ error: 'Failed to check environment' }, { status: 500 });
  }
}
