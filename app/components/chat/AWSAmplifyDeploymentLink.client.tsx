import { useStore } from '@nanostores/react';
import { awsConnection, checkAWSCredentials } from '~/lib/stores/aws';
import { chatId } from '~/lib/persistence/useChatHistory';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useState } from 'react';

export function AWSAmplifyDeploymentLink() {
  const connection = useStore(awsConnection);
  const currentChatId = useStore(chatId);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchAppData() {
      // Check if AWS credentials are available from environment
      const hasCredentials = await checkAWSCredentials();

      if (!hasCredentials || !currentChatId) {
        return;
      }

      // Check if we have a stored app ID for this chat
      const appId = localStorage.getItem(`aws-amplify-app-${currentChatId}`);

      if (!appId) {
        return;
      }

      setIsLoading(true);

      try {
        // Fetch app details from AWS Amplify
        const appResponse = await fetch(`https://amplify.${connection.region}.amazonaws.com/apps/${appId}`, {
          method: 'GET',
          headers: {
            Authorization: `AWS4-HMAC-SHA256 Credential=${connection.accessKeyId}/${new Date().toISOString().split('T')[0]}/${connection.region}/amplify/aws4_request`,
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'Amplify_20170701.GetApp',
          },
        });

        if (appResponse.ok) {
          const appData = (await appResponse.json()) as any;
          const app = appData.app;

          if (app && app.defaultDomain) {
            setDeploymentUrl(`https://${app.defaultDomain}`);
            return;
          }
        }

        // Fallback: try to construct URL from appId
        if (appId) {
          setDeploymentUrl(`https://${appId}.amplifyapp.com`);
        }
      } catch (err) {
        console.error('Error fetching AWS Amplify deployment:', err);

        // Fallback: try to construct URL from appId
        if (appId) {
          setDeploymentUrl(`https://${appId}.amplifyapp.com`);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchAppData();
  }, [connection.accessKeyId, connection.secretAccessKey, connection.region, currentChatId]);

  if (!deploymentUrl) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <a
            href={deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textSecondary hover:text-[#FF9900] z-50"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className={`i-ph:link w-4 h-4 hover:text-orange-400 ${isLoading ? 'animate-pulse' : ''}`} />
          </a>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="px-3 py-2 rounded bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary text-xs z-50"
            sideOffset={5}
          >
            {deploymentUrl}
            <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
