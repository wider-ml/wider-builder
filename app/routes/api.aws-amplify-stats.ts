import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { AmplifyClient, ListAppsCommand } from '@aws-sdk/client-amplify';

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get AWS credentials from environment variables
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      return json({ error: 'AWS credentials not configured in environment variables' }, { status: 401 });
    }

    // Initialize AWS Amplify client
    const amplifyClient = new AmplifyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    try {
      // List all Amplify apps
      const listAppsCommand = new ListAppsCommand({
        maxResults: 50, // Limit to 50 apps for performance
      });

      const appsResponse = await amplifyClient.send(listAppsCommand);
      const apps = appsResponse.apps || [];

      // Map AWS Amplify apps to our expected format
      const mappedApps = apps.map((app) => ({
        appId: app.appId || '',
        appArn: app.appArn || '',
        name: app.name || '',
        description: app.description || '',
        repository: app.repository || '',
        platform: app.platform || 'WEB',
        createTime: app.createTime?.toISOString() || '',
        updateTime: app.updateTime?.toISOString() || '',
        defaultDomain: app.defaultDomain || '',
        enableBranchAutoBuild: app.enableBranchAutoBuild || false,
        enableBasicAuth: app.enableBasicAuth || false,
      }));

      console.log(`Retrieved ${mappedApps.length} AWS Amplify apps from region ${region}`);

      return json({
        apps: mappedApps,
        totalApps: mappedApps.length,
      });
    } catch (error) {
      console.error('Error listing AWS Amplify apps:', error);
      throw new Error(`Failed to list Amplify apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('AWS Amplify stats error:', error);
    return json({ error: 'Failed to fetch AWS Amplify statistics' }, { status: 500 });
  }
}
