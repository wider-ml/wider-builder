import { createScopedLogger } from '~/utils/logger';
import { MCPService } from '~/lib/services/mcpService';

const logger = createScopedLogger('api.mcp-check');

export async function loader() {
  try {
    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.checkServersAvailabilities();

    return new Response(JSON.stringify(serverTools), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error checking MCP servers:', error);
    return new Response(JSON.stringify({ error: 'Failed to check MCP servers' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
