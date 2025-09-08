import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { IProviderSetting, ProviderInfo } from '~/types/model';
import { generateText } from 'ai';
import { PROVIDER_LIST } from '~/utils/constants';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { spendCredits, checkCredits } from '~/lib/services/creditService';

export async function action(args: ActionFunctionArgs) {
  return llmCallAction(args);
}

async function getModelList(options: {
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  serverEnv?: Record<string, string>;
}) {
  const llmManager = LLMManager.getInstance(process.env as Record<string, string>);
  return llmManager.updateModelList(options);
}

const logger = createScopedLogger('api.llmcall');

async function llmCallAction({ context, request }: ActionFunctionArgs) {
  const { system, message, model, provider, streamOutput, isCodeGeneration } = await request.json<{
    system: string;
    message: string;
    model: string;
    provider: ProviderInfo;
    streamOutput?: boolean;
    isCodeGeneration?: boolean;
  }>();

  const { name: providerName } = provider;

  // validate 'model' and 'provider' fields
  if (!model || typeof model !== 'string') {
    throw new Response('Invalid or missing model', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  if (!providerName || typeof providerName !== 'string') {
    throw new Response('Invalid or missing provider', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  const cookieHeader = request.headers.get('Cookie');
  const authHeader = request.headers.get('authorization');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  // Check credits BEFORE making LLM API call for Anthropic code generation
  if (providerName === 'Anthropic' && isCodeGeneration) {
    console.log('🔥 api.llmcall - Checking credits before LLM call');
    try {
      const token = authHeader?.replace('Bearer ', '');
      await checkCredits(
        (context.cloudflare?.env as unknown as Record<string, string>) || (process.env as Record<string, string>),
        token,
      );
    } catch (creditError: any) {
      console.log('💳 api.llmcall - Credit check failed:', creditError.message);

      // Return credit error to client
      const errorResponse = {
        error: true,
        message: creditError.message || 'Credit check failed',
        statusCode: creditError.statusCode || 402,
        isRetryable: false,
        provider: providerName,
        creditError: true,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Payment Required',
      });
    }
  }

  if (streamOutput) {
    try {
      const result = await streamText({
        options: {
          system,
        },
        messages: [
          {
            role: 'user',
            content: `${message}`,
          },
        ],
        env: context.cloudflare?.env as any,
        apiKeys,
        providerSettings,
      });

      // Call credit spending API for successful Anthropic API calls (streaming) - only for code generation
      if (providerName === 'Anthropic' && isCodeGeneration) {
        console.log('🔥 api.llmcall (streaming) - Calling spendCredits for Anthropic code generation');
        try {
          const authHeader = request.headers.get('authorization');
          const token = authHeader?.replace('Bearer ', '');
          console.log('🔥 api.llmcall (streaming) - authHeader:', !!authHeader, 'token:', !!token);
          await spendCredits(
            (context.cloudflare?.env as unknown as Record<string, string>) || (process.env as Record<string, string>),
            token,
          );
        } catch (creditError) {
          // Log but don't fail the request if credit spending fails
          logger.warn('❌ Credit spending API call failed (streaming):', creditError);
        }
      } else {
        console.log('🔥 api.llmcall (streaming) - Skipping credit spending (not Anthropic code generation)');
      }

      return new Response(result.textStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: unknown) {
      console.log(error);

      if (error instanceof Error && error.message?.includes('API key')) {
        throw new Response('Invalid or missing API key', {
          status: 401,
          statusText: 'Unauthorized',
        });
      }

      throw new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  } else {
    try {
      const models = await getModelList({
        apiKeys,
        providerSettings,
        serverEnv:
          (context.cloudflare?.env as unknown as Record<string, string>) || (process.env as Record<string, string>),
      });
      const modelDetails = models.find((m: ModelInfo) => m.name === model);

      if (!modelDetails) {
        throw new Error('Model not found');
      }

      const dynamicMaxTokens = modelDetails && modelDetails.maxTokenAllowed ? modelDetails.maxTokenAllowed : MAX_TOKENS;

      const providerInfo = PROVIDER_LIST.find((p) => p.name === provider.name);

      if (!providerInfo) {
        throw new Error('Provider not found');
      }

      logger.info(`Generating response Provider: ${provider.name}, Model: ${modelDetails.name}`);

      const result = await generateText({
        system,
        messages: [
          {
            role: 'user',
            content: `${message}`,
          },
        ],
        model: providerInfo.getModelInstance({
          model: modelDetails.name,
          serverEnv: context.cloudflare?.env || (process.env as any),
          apiKeys,
          providerSettings,
        }),
        maxTokens: dynamicMaxTokens,
        toolChoice: 'none',
      });
      logger.info(`Generated response`);

      // Call credit spending API for successful Anthropic API calls - only for code generation
      console.log(
        '🔥 api.llmcall (non-streaming) - providerName:',
        providerName,
        'isCodeGeneration:',
        isCodeGeneration,
      );
      if (providerName === 'Anthropic' && isCodeGeneration) {
        console.log('🔥 api.llmcall (non-streaming) - Calling spendCredits for Anthropic code generation');
        try {
          const authHeader = request.headers.get('authorization');
          const token = authHeader?.replace('Bearer ', '');
          console.log('🔥 api.llmcall (non-streaming) - authHeader:', !!authHeader, 'token:', !!token);
          await spendCredits(
            (context.cloudflare?.env as unknown as Record<string, string>) || (process.env as Record<string, string>),
            token,
          );
        } catch (creditError) {
          // Log but don't fail the request if credit spending fails
          logger.warn('❌ Credit spending API call failed (non-streaming):', creditError);
        }
      } else {
        console.log('🔥 api.llmcall (non-streaming) - Skipping credit spending (not Anthropic code generation)');
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: unknown) {
      console.log(error);

      const errorResponse = {
        error: true,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        statusCode: (error as any).statusCode || 500,
        isRetryable: (error as any).isRetryable !== false,
        provider: (error as any).provider || 'unknown',
        creditError: (error as any).creditError || false,
      };

      // Handle credit errors specifically
      if (error instanceof Error && (error as any).creditError) {
        return new Response(
          JSON.stringify({
            ...errorResponse,
            message: error.message,
            statusCode: (error as any).statusCode || 402,
            isRetryable: false,
            creditError: true,
          }),
          {
            status: (error as any).statusCode || 402,
            headers: { 'Content-Type': 'application/json' },
            statusText: 'Payment Required',
          },
        );
      }

      if (error instanceof Error && error.message?.includes('API key')) {
        return new Response(
          JSON.stringify({
            ...errorResponse,
            message: 'Invalid or missing API key',
            statusCode: 401,
            isRetryable: false,
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
            statusText: 'Unauthorized',
          },
        );
      }

      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Error',
      });
    }
  }
}
