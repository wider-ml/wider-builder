import { atom } from 'nanostores';
import type { AWSConnection } from '~/types/aws';
import { logStore } from './logs';
import { toast } from 'react-toastify';

// Check if AWS credentials are available from environment
const hasAWSCredentials = () => {
  if (typeof window !== 'undefined') {
    // On client side, we'll check via API call
    return false;
  }

  // On server side, check environment variables
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
};

// Initialize connection based on environment variables
const initialConnection: AWSConnection = {
  user: hasAWSCredentials()
    ? {
        id: 'env-user',
        username: 'Environment User',
        email: 'user@env.local',
        name: 'AWS Environment User',
      }
    : null,
  accessKeyId: '',
  secretAccessKey: '',
  region: 'us-east-1',
  stats: undefined,
};

export const awsConnection = atom<AWSConnection>(initialConnection);
export const isConnecting = atom<boolean>(false);
export const isFetchingStats = atom<boolean>(false);

export const updateAWSConnection = (updates: Partial<AWSConnection>) => {
  const currentState = awsConnection.get();
  const newState = { ...currentState, ...updates };
  awsConnection.set(newState);
};

// Check AWS credentials from environment
export const checkAWSCredentials = async () => {
  try {
    const response = await fetch('/api/aws-check-credentials');
    const data = (await response.json()) as { hasCredentials: boolean; region?: string };

    if (data.hasCredentials) {
      updateAWSConnection({
        user: {
          id: 'env-user',
          username: 'Environment User',
          email: 'user@env.local',
          name: 'AWS Environment User',
        },
        accessKeyId: 'from-env',
        secretAccessKey: 'from-env',
        region: data.region || 'us-east-1',
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking AWS credentials:', error);
    return false;
  }
};

export async function fetchAWSAmplifyStats() {
  try {
    isFetchingStats.set(true);

    // Call our API route to fetch Amplify apps (credentials read from environment)
    const response = await fetch('/api/aws-amplify-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AWS Amplify stats: ${response.status}`);
    }

    const data = (await response.json()) as any;

    if (data.error) {
      throw new Error(data.error);
    }

    const currentState = awsConnection.get();
    updateAWSConnection({
      ...currentState,
      stats: {
        apps: data.apps || [],
        totalApps: data.apps?.length || 0,
      },
    });
  } catch (error) {
    console.error('AWS Amplify API Error:', error);
    logStore.logError('Failed to fetch AWS Amplify stats', { error });
    toast.error('Failed to fetch AWS Amplify statistics');
  } finally {
    isFetchingStats.set(false);
  }
}
