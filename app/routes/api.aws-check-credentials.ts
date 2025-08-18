import { json } from '@remix-run/cloudflare';

export async function loader() {
  try {
    // Check if AWS credentials are available in environment variables
    const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    const region = process.env.AWS_REGION || 'us-east-1';

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
