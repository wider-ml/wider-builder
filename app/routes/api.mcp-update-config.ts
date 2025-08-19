import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { MCPService, type MCPConfig } from '~/lib/services/mcpService';

const logger = createScopedLogger('api.mcp-update-config');

export async function action({ request }: ActionFunctionArgs) {
  try {
    const mcpConfig = (await request.json()) as MCPConfig;

    if (!mcpConfig || typeof mcpConfig !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid MCP servers configuration' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.updateConfig(mcpConfig);

    return new Response(JSON.stringify(serverTools), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error updating MCP config:', error);
    return new Response(JSON.stringify({ error: 'Failed to update MCP config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
