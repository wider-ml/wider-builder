import { json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { createScopedLogger } from '~/utils/logger';
import { extractUserIdFromRequest } from '~/utils/auth.server';
import type { Message } from 'ai';
import type { IChatMetadata } from '~/lib/persistence/db';

const logger = createScopedLogger('api.chats.$id');

export interface ChatDocument {
  id: string;
  userId: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

// GET /api/chats/:id - Get chat by ID from Django API
export const loader: LoaderFunction = async ({ request, params, context }) => {
  const { id } = params;

  if (!id) {
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
    const response = await fetch(`${API_ROOT_URL}/api/v1/web-projects/?chat_id=${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return json({ error: 'Chat not found' }, { status: 404 });
      }
      logger.error(`Failed to fetch chat from Django API: ${response.status} ${response.statusText}`);
      return json({ error: 'Failed to fetch chat' }, { status: response.status });
    }

    const webProjects = (await response.json()) as any[];

    // Find the project with matching chat_id
    const project = webProjects.find((p: any) => p.chat_id === id);

    if (!project) {
      return json({ error: 'Chat not found' }, { status: 404 });
    }

    // Convert Django WebProject format to ChatDocument format
    const chatData = {
      id: project.chat_id,
      userId,
      urlId: project.chat_id,
      description: project.title,
      messages: project.chat_data?.messages || [],
      timestamp: project.created_at || new Date().toISOString(),
      metadata: project.chat_data?.metadata,
    };

    return json(chatData);
  } catch (error) {
    logger.error('Failed to fetch chat:', error);
    return json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
};

// PUT /api/chats/:id - Update chat via Django API
export const action: ActionFunction = async ({ request, params, context }) => {
  const { id } = params;

  if (!id) {
    return json({ error: 'Chat ID is required' }, { status: 400 });
  }

  if (request.method === 'PUT') {
    try {
      const userId = extractUserIdFromRequest(request);
      const chatData = (await request.json()) as Partial<ChatDocument>;
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

      // Prepare data for Django WebProject model
      const webProjectData = {
        title: chatData.description || 'Updated Chat',
        chat_id: id,
        chat_data: chatData, // Store entire chatData as JSON
        host_app_id: '',
      };

      // Update via Django API using PATCH
      const response = await fetch(`${API_ROOT_URL}/api/v1/web-projects/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(webProjectData),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return json({ error: 'Chat not found' }, { status: 404 });
        }
        const errorText = await response.text();
        logger.error(`Failed to update chat in Django API: ${response.status} ${response.statusText} - ${errorText}`);
        return json({ error: 'Failed to update chat' }, { status: response.status });
      }

      const result = (await response.json()) as any;
      logger.info(`Chat ${id} updated successfully for user ${userId}`);

      return json({ success: true, id, projectId: result.id });
    } catch (error) {
      logger.error('Failed to update chat:', error);
      return json({ error: 'Failed to update chat' }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
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

      // Delete via Django API
      const response = await fetch(`${API_ROOT_URL}/api/v1/web-projects/${id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return json({ error: 'Chat not found' }, { status: 404 });
        }
        const errorText = await response.text();
        logger.error(`Failed to delete chat in Django API: ${response.status} ${response.statusText} - ${errorText}`);
        return json({ error: 'Failed to delete chat' }, { status: response.status });
      }

      logger.info(`Chat ${id} deleted successfully for user ${userId}`);

      return json({ success: true, id });
    } catch (error) {
      logger.error('Failed to delete chat:', error);
      return json({ error: 'Failed to delete chat' }, { status: 500 });
    }
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};
