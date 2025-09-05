import { toast } from 'react-toastify';

export interface CreditSpendRequest {
  operation_type: 'code_generation';
}

export interface CreditSpendResponse {
  success: boolean;
  error?: string;
  details?: {
    required_credits: number;
    available_credits: number;
    deficit: number;
  };
}

/**
 * Call the credit spending API after a successful Anthropic API call
 */
export async function spendCredits(serverEnv?: Record<string, string>, authToken?: string): Promise<void> {
  console.log('🔍 [DEBUG] spendCredits function called');
  console.log('🔍 [DEBUG] serverEnv keys:', serverEnv ? Object.keys(serverEnv) : 'undefined');
  console.log('🔍 [DEBUG] authToken provided:', !!authToken);

  // Get the base URL from environment variables
  const baseUrl = serverEnv?.API_ROOT_URL || process.env.API_ROOT_URL;
  console.log('🔍 [DEBUG] baseUrl resolved:', baseUrl);

  if (!baseUrl) {
    console.warn('❌ [DEBUG] API_ROOT_URL not configured, skipping credit spending API call');
    return;
  }

  if (!authToken) {
    console.warn('❌ [DEBUG] No authorization token provided, skipping credit spending API call');
    return;
  }

  console.log('🚀 [DEBUG] Making credit spending API call to:', `${baseUrl}/api/v1/subscription/credit/spend/`);

  try {
    const response = await fetch(`${baseUrl}/api/v1/subscription/credit/spend/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        operation_type: 'code_generation',
      } as CreditSpendRequest),
    });

    console.log('📡 [DEBUG] Credit API response status:', response.status);
    console.log('📡 [DEBUG] Credit API response ok:', response.ok);

    const data: CreditSpendResponse = await response.json();
    console.log('📡 [DEBUG] Credit API response data:', JSON.stringify(data, null, 2));

    if (!data.success) {
      if (data.error === 'Insufficient credits') {
        console.log('💳 [DEBUG] Insufficient credits detected, showing toast');
        toast.error('Insufficient Credits');
      } else {
        console.warn('⚠️ [DEBUG] Credit spending failed:', data.error);
      }
    } else {
      console.log('✅ [DEBUG] Credit spending successful');
    }
  } catch (error) {
    // Silently handle network errors to avoid disrupting the user experience
    console.warn('❌ [DEBUG] Failed to call credit spending API:', error);
  }
}
