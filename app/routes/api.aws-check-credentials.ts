import { json, type LoaderFunction } from '@remix-run/cloudflare';

export const loader: LoaderFunction = async ({ context }) => {
  try {
    // Check if AWS credentials are available in Cloudflare context or environment variables
    const env = (context.cloudflare?.env as any) || process.env;
    const hasCredentials = !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
    const region = env.AWS_REGION || 'us-east-1';

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
};
