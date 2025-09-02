import { json, type LoaderFunction } from '@remix-run/node';
import { createScopedLogger } from '~/utils/logger';
import { extractUserIdFromRequest } from '~/utils/auth.server';

const logger = createScopedLogger('api.snapshots.$chatId');

// GET /api/snapshots/:chatId - Get snapshot by chat ID from Django API
export const loader: LoaderFunction = async ({ request, params, context }) => {
  const { chatId } = params;

  if (!chatId) {
    return json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const userId = extractUserIdFromRequest(request);
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const API_ROOT_URL = (context.cloudflare?.env as any)?.API_ROOT_URL || process.env.API_ROOT_URL;

    if (!API_ROOT_URL) {
      logger.error('API_ROOT_URL environment variable is not set');
      return json({ error: 'API configuration error' }, { status: 500 });
    }

    // Fetch specific web project by chat_id from Django API
    const response = await fetch(`${API_ROOT_URL}/api/v1/web-projects/?chat_id=${chatId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return json({ error: 'Snapshot not found' }, { status: 404 });
      }
      logger.error(`Failed to fetch snapshot from Django API: ${response.status} ${response.statusText}`);
      return json({ error: 'Failed to fetch snapshot' }, { status: response.status });
    }

    const webProjects = (await response.json()) as any[];

    // Find the project with matching chat_id
    const project = webProjects.find((p: any) => p.chat_id === chatId);

    if (!project || !project.snapshot_data) {
      return json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Return just the snapshot data
    return json(project.snapshot_data);
  } catch (error) {
    logger.error('Failed to fetch snapshot:', error);
    return json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
};
