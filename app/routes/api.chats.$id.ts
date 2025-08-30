import { json, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { getChatsCollection, getSnapshotsCollection } from '~/lib/db/mongodb';
import { createScopedLogger } from '~/utils/logger';
import { extractUserIdFromRequest } from '~/utils/auth.server';
import type { Message } from 'ai';
import type { IChatMetadata } from '~/lib/persistence/db';

const logger = createScopedLogger('api.chats.$id');

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

// GET /api/chats/:id - Get chat by ID
export const loader: LoaderFunction = async ({ request, context, params }) => {
  const { id } = params;

  if (!id) {
    return json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const userId = extractUserIdFromRequest(request);
    const collection = await getChatsCollection(context);

    // Try to find by id first, then by urlId - but always filter by userId
    let chat = await collection.findOne({ id, userId });

    if (!chat) {
      chat = await collection.findOne({ urlId: id, userId });
    }

    if (!chat) {
      return json({ error: 'Chat not found' }, { status: 404 });
    }

    // Remove MongoDB _id for compatibility
    const { _id, ...chatData } = chat;

    return json(chatData);
  } catch (error) {
    logger.error('Failed to fetch chat:', error);
    return json({ error: 'Unauthorized or failed to fetch chat' }, { status: 401 });
  }
};

// PUT /api/chats/:id - Update chat
export const action: ActionFunction = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    return json({ error: 'Chat ID is required' }, { status: 400 });
  }

  if (request.method === 'PUT') {
    try {
      const userId = extractUserIdFromRequest(request);
      const chatData = (await request.json()) as Partial<ChatDocument>;
      const collection = await getChatsCollection();

      // Find existing chat - filter by userId for security
      const existingChat = await collection.findOne({
        $or: [
          { id, userId },
          { urlId: id, userId },
        ],
      });

      if (!existingChat) {
        return json({ error: 'Chat not found' }, { status: 404 });
      }

      // Update the chat
      const updateData = {
        ...chatData,
        id: existingChat.id, // Keep original ID
        userId, // Ensure userId is maintained
        timestamp: new Date().toISOString(),
      };

      const result = await collection.updateOne({ _id: existingChat._id }, { $set: updateData });

      if (result.modifiedCount === 0) {
        return json({ error: 'Failed to update chat' }, { status: 500 });
      }

      logger.info(`Chat ${id} updated successfully for user ${userId}`);

      return json({ success: true, id: existingChat.id });
    } catch (error) {
      logger.error('Failed to update chat:', error);
      return json({ error: 'Unauthorized or failed to update chat' }, { status: 401 });
    }
  }

  if (request.method === 'DELETE') {
    try {
      const userId = extractUserIdFromRequest(request);
      const chatsCollection = await getChatsCollection();
      const snapshotsCollection = await getSnapshotsCollection();

      // Find the chat first - filter by userId for security
      const chat = await chatsCollection.findOne({
        $or: [
          { id, userId },
          { urlId: id, userId },
        ],
      });

      if (!chat) {
        return json({ error: 'Chat not found' }, { status: 404 });
      }

      // Delete chat and associated snapshot
      const [chatResult] = await Promise.all([
        chatsCollection.deleteOne({ _id: chat._id }),
        snapshotsCollection.deleteOne({ chatId: chat.id, userId }),
      ]);

      if (chatResult.deletedCount === 0) {
        return json({ error: 'Failed to delete chat' }, { status: 500 });
      }

      logger.info(`Chat ${id} and associated snapshot deleted successfully for user ${userId}`);

      return json({ success: true, id: chat.id });
    } catch (error) {
      logger.error('Failed to delete chat:', error);
      return json({ error: 'Unauthorized or failed to delete chat' }, { status: 401 });
    }
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};
