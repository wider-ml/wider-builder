import { toast } from 'react-toastify';

export interface CreditSpendingRequest {
  operation_type: string;
}

export interface CreditSpendingResponse {
  success: boolean;
  error?: string;
  details?: {
    required_credits: number;
    available_credits: number;
    deficit: number;
  };
}

/**
 * Call the credit spending API after successful Anthropic API calls
 */
export async function callCreditSpendingAPI(baseUrl: string, operationType: string = 'code_generation'): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/subscription/credit/spend/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation_type: operationType,
      } as CreditSpendingRequest),
    });

    const data: CreditSpendingResponse = await response.json();

    if (!response.ok || !data.success) {
      // Handle insufficient credits error
      if (data.error === 'Insufficient credits') {
        toast.error('Insufficient Credits');
        console.warn('Credit spending failed:', data);
        return;
      }

      // Handle other errors silently (don't show toast for other API errors)
      console.warn('Credit spending API error:', data);
      return;
    }

    // Success case - no need to show toast for successful credit spending
    console.log('Credit spending recorded successfully');
  } catch (error) {
    // Network or other errors - log but don't show toast to user
    console.warn('Credit spending API call failed:', error);
  }
}

/**
 * Get the credit spending API base URL from environment variables
 */
export function getCreditSpendingBaseUrl(serverEnv?: Record<string, string>): string | null {
  // Try to get from server environment first, then process.env
  const env = serverEnv || process.env;

  // Look for common environment variable names for the API base URL
  return env.CREDIT_API_BASE_URL || env.API_BASE_URL || null;
}
