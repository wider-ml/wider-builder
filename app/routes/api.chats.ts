import { json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { createScopedLogger } from '~/utils/logger';
import { extractUserIdFromRequest } from '~/utils/auth.server';
import type { Message } from 'ai';
import type { IChatMetadata } from '~/lib/persistence/db';

const logger = createScopedLogger('api.chats');

export interface ChatDocument {
  id: string;
  userId: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

// GET /api/chats - Get all chats from Django API
export const loader: LoaderFunction = async ({ request, context }) => {
  try {
    const userId = extractUserIdFromRequest(request);
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const API_ROOT_URL = (context.cloudflare?.env as any)?.API_ROOT_URL || process.env.API_ROOT_URL;
    const response = await fetch(`${API_ROOT_URL}/api/v1/web-projects/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.error(`Failed to fetch chats from Django API: ${response.status} ${response.statusText}`);
      return json({ error: 'Failed to fetch chats' }, { status: response.status });
    }

    const webProjects = (await response.json()) as any[];

    // Convert Django WebProject format to ChatDocument format
    const formattedChats = webProjects.map((project: any) => ({
      id: project.chat_id,
      userId,
      urlId: project.chat_id,
      description: project.title,
      messages: project.chat_data?.messages || [],
      timestamp: project.created_at || new Date().toISOString(),
      metadata: project.chat_data?.metadata,
    }));

    return json(formattedChats);
  } catch (error) {
    logger.error('Failed to fetch chats:', error);
    return json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
};

// POST /api/chats - Create or update a chat in Django API
export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = extractUserIdFromRequest(request);
    const chatData = (await request.json()) as ChatDocument;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return json({ error: 'No authorization token provided' }, { status: 401 });
    }

    if (!chatData.id) {
      return json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const API_ROOT_URL = (context.cloudflare?.env as any)?.API_ROOT_URL || process.env.API_ROOT_URL;

    if (!API_ROOT_URL) {
      logger.error('API_ROOT_URL environment variable is not set');
      return json({ error: 'API configuration error' }, { status: 500 });
    }

    // Prepare data for Django WebProject model - store entire chatData as JSON
    const webProjectData = {
      title: chatData.description || 'New Chat',
      chat_id: chatData.id,
      chat_data: chatData, // Store entire chatData as JSON
      host_app_id: '',
    };

    logger.info(`Attempting to save chat to Django API: ${API_ROOT_URL}/api/v1/web-projects/`);
    logger.info(`Chat data:`, { chatId: chatData.id, description: chatData.description });

    // Send to Django API
    const response = await fetch(`${API_ROOT_URL}/api/v1/web-projects/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(webProjectData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to save chat in Django API: ${response.status} ${response.statusText} - ${errorText}`);
      return json({ error: 'Failed to save chat' }, { status: response.status });
    }

    const result = (await response.json()) as any;
    logger.info(`Chat ${chatData.id} saved for user ${userId}`);

    return json({
      success: true,
      id: chatData.id,
      created: true,
      projectId: result.id,
    });
  } catch (error) {
    logger.error('Failed to save chat:', error);
    return json({ error: 'Failed to save chat' }, { status: 500 });
  }
};
