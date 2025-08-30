import { json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { getChatsCollection } from '~/lib/db/mongodb';
import { createScopedLogger } from '~/utils/logger';
import { extractUserIdFromRequest } from '~/utils/auth.server';
import type { Message } from 'ai';
import type { IChatMetadata } from '~/lib/persistence/db';

const logger = createScopedLogger('api.chats');

export interface ChatDocument {
  _id?: string;
  id: string;
  userId: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

// GET /api/chats - Get all chats
export const loader: LoaderFunction = async ({ request, context }) => {
  try {
    const userId = extractUserIdFromRequest(request);
    const collection = await getChatsCollection(context);
    const chats = await collection.find({ userId }).sort({ timestamp: -1 }).toArray();

    // Convert MongoDB _id to id for compatibility
    const formattedChats = chats.map((chat) => ({
      ...chat,
      _id: undefined, // Remove MongoDB _id
    }));

    return json(formattedChats);
  } catch (error) {
    logger.error('Failed to fetch chats:', error);
    return json({ error: 'Unauthorized or failed to fetch chats' }, { status: 401 });
  }
};

// POST /api/chats - Create or update a chat
export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = extractUserIdFromRequest(request);
    const chatData = (await request.json()) as ChatDocument;

    const authHeader = request.headers.get('authorization');

    const token = authHeader?.replace('Bearer ', '');

    if (!chatData.id) {
      return json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const collection = await getChatsCollection(context);

    // Prepare document for MongoDB
    const document: ChatDocument = {
      id: chatData.id,
      userId,
      urlId: chatData.urlId,
      description: chatData.description,
      messages: chatData.messages || [],
      timestamp: chatData.timestamp || new Date().toISOString(),
      metadata: chatData.metadata,
    };

    // Use upsert to create or update - filter by both id and userId for security
    const result = await collection.replaceOne({ id: chatData.id, userId }, document, { upsert: true });

    logger.info(`Chat ${chatData.id} ${result.upsertedId ? 'created' : 'updated'} for user ${userId}`);

    if (!!result.upsertedId) {
      const chatInfoForWider = {
        title: document.description || 'New Chat',
        url: '',
        snapshot_id: '',
        chat_id: document.id,
        host_app_id: '',
      };

      const URL = process.env.API_ROOT_URL;

      const response = await fetch(`${URL}/api/v1/web-projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(chatInfoForWider),
      });

      if (!response.ok) {
        console.log(`Failed to create chat in Wider:}, ${response.status} ${response.statusText}`);
      } else {
        console.log(`Chat created in Wider successfully: ${chatInfoForWider.chat_id}`);
      }
    }

    return json({
      success: true,
      id: chatData.id,
      created: !!result.upsertedId,
    });
  } catch (error) {
    logger.error('Failed to save chat:', error);
    return json({ error: 'Unauthorized or failed to save chat' }, { status: 401 });
  }
};
