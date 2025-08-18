import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { AmplifyClient, GetDomainAssociationCommand } from '@aws-sdk/client-amplify';

interface DomainStatusRequestBody {
  appId: string;
  domainName: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { appId, domainName } = (await request.json()) as DomainStatusRequestBody;

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
      // Get domain association status from AWS Amplify
      const getDomainCommand = new GetDomainAssociationCommand({
        appId,
        domainName,
      });

      const domainResponse = await amplifyClient.send(getDomainCommand);
      const domainAssociation = domainResponse.domainAssociation;

      if (!domainAssociation) {
        return json({ error: 'Domain association not found' }, { status: 404 });
      }

      console.log(`Domain ${domainName} status: ${domainAssociation.domainStatus}`);

      // Map domain status to user-friendly messages
      const getStatusMessage = (status: string) => {
        switch (status) {
          case 'PENDING_VERIFICATION':
            return 'Domain verification in progress. This may take a few minutes.';
          case 'IN_PROGRESS':
            return 'Domain setup is in progress.';
          case 'PENDING_DEPLOYMENT':
            return 'Domain verified, deployment in progress.';
          case 'AVAILABLE':
            return 'Domain is active and ready to use!';
          case 'UPDATING':
            return 'Domain configuration is being updated.';
          case 'FAILED':
            return 'Domain setup failed. Please check your DNS configuration.';
          default:
            return `Domain status: ${status}`;
        }
      };

      // Get subdomain information
      const subDomains =
        domainAssociation.subDomains?.map((subDomain) => ({
          prefix: subDomain.subDomainSetting?.prefix || '',
          branchName: subDomain.subDomainSetting?.branchName || '',
          dnsRecord: subDomain.dnsRecord || null,
          verified: subDomain.verified || false,
        })) || [];

      return json({
        domainName,
        status: domainAssociation.domainStatus,
        statusReason: domainAssociation.statusReason || null,
        message: getStatusMessage(domainAssociation.domainStatus || 'UNKNOWN'),
        certificate: domainAssociation.certificate || null,
        subDomains,
        dnsRecord: domainAssociation.domainName
          ? {
              name: domainAssociation.domainName,
              type: 'CNAME',
              value: `${appId}.amplifyapp.com`,
            }
          : null,
        isReady: domainAssociation.domainStatus === 'AVAILABLE',
        url: domainAssociation.domainStatus === 'AVAILABLE' ? `https://${domainName}` : null,
      });
    } catch (error) {
      console.error('Error getting domain status from AWS Amplify:', error);

      // If the domain is not found, it might not be created yet
      if (error instanceof Error && error.message.includes('not found')) {
        return json(
          {
            error: 'Domain association not found',
            message: 'The domain association was not found in AWS Amplify. It may not have been created yet.',
            suggestion: 'Try again in a few moments or check the AWS Amplify console.',
          },
          { status: 404 },
        );
      }

      throw new Error(`Failed to get domain status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('AWS Amplify domain status check error:', error);
    return json({ error: 'Failed to check domain status' }, { status: 500 });
  }
}
