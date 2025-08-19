import type { LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { getApiKeysFromCookie } from '~/lib/api/cookies';

export const loader: LoaderFunction = async ({ context, request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider) {
    return new Response(JSON.stringify({ isSet: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Initialize LLMManager with process.env for Node.js environment
  const llmManager = LLMManager.getInstance(process.env as any);
  const providerInstance = llmManager.getProvider(provider);

  if (!providerInstance || !providerInstance.config.apiTokenKey) {
    return new Response(JSON.stringify({ isSet: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const envVarName = providerInstance.config.apiTokenKey;

  // Get API keys from cookie
  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);

  /*
   * Check API key in order of precedence:
   * 1. Client-side API keys (from cookies)
   * 2. Process environment variables (Node.js environment)
   * 3. Server environment variables (from Cloudflare env - fallback)
   * 4. LLMManager environment variables
   */
  const isSet = !!(
    apiKeys?.[provider] ||
    process.env[envVarName] ||
    (context?.cloudflare?.env as Record<string, any>)?.[envVarName] ||
    llmManager.env[envVarName]
  );

  return new Response(JSON.stringify({ isSet }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
