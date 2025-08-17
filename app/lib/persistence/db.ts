import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem } from './useChatHistory';
import type { Snapshot } from './types';
import { axios } from '~/lib/axios/customAxios';

export interface IChatMetadata {
  gitUrl: string;
  gitBranch?: string;
  netlifySiteId?: string;
}

const logger = createScopedLogger('ChatHistory');

// MongoDB-based implementation - no database connection needed on client
export async function openDatabase(): Promise<boolean> {
  // Always return true since we're using API calls now
  return true;
}

export async function getAll(): Promise<ChatHistoryItem[]> {
  try {
    const response = await axios.get('/api/chats');

    return response as unknown as ChatHistoryItem[];
  } catch (error) {
    logger.error('Failed to fetch chats:', error);
    throw error;
  }
}

export async function setMessages(
  _db: any,
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
  timestamp?: string,
  metadata?: IChatMetadata,
): Promise<void> {
  try {
    if (timestamp && isNaN(Date.parse(timestamp))) {
      throw new Error('Invalid timestamp');
    }

    await axios.post('/api/chats', {
      id,
      messages,
      urlId,
      description,
      timestamp: timestamp ?? new Date().toISOString(),
      metadata,
    });
  } catch (error) {
    logger.error('Failed to save messages:', error);
    throw error;
  }
}

export async function getMessages(_db: any, id: string): Promise<ChatHistoryItem> {
  try {
    const response = await axios.get(`/api/chats/${id}`);

    return response as unknown as ChatHistoryItem;
  } catch (error) {
    logger.error('Failed to fetch chat:', error);
    throw error;
  }
}

export async function getMessagesByUrlId(_db: any, id: string): Promise<ChatHistoryItem> {
  return getMessages(_db, id);
}

export async function getMessagesById(_db: any, id: string): Promise<ChatHistoryItem> {
  return getMessages(_db, id);
}

export async function deleteById(_db: any, id: string): Promise<void> {
  try {
    await axios.delete(`/api/chats/${id}`);
  } catch (error) {
    logger.error('Failed to delete chat:', error);
    throw error;
  }
}

export async function getNextId(_db: any): Promise<string> {
  // Generate a simple timestamp-based ID
  return Date.now().toString();
}

export async function getUrlId(_db: any, id: string): Promise<string> {
  // For MongoDB, we can use the same ID as urlId since we don't have the same constraints
  return id;
}

export async function forkChat(_db: any, chatId: string, messageId: string): Promise<string> {
  const chat = await getMessages(_db, chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Find the index of the message to fork at
  const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);

  if (messageIndex === -1) {
    throw new Error('Message not found');
  }

  // Get messages up to and including the selected message
  const messages = chat.messages.slice(0, messageIndex + 1);

  return createChatFromMessages(_db, chat.description ? `${chat.description} (fork)` : 'Forked chat', messages);
}

export async function duplicateChat(_db: any, id: string): Promise<string> {
  const chat = await getMessages(_db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  return createChatFromMessages(_db, `${chat.description || 'Chat'} (copy)`, chat.messages);
}

export async function createChatFromMessages(
  _db: any,
  description: string,
  messages: Message[],
  metadata?: IChatMetadata,
): Promise<string> {
  const newId = await getNextId(_db);
  const newUrlId = await getUrlId(_db, newId);

  await setMessages(_db, newId, messages, newUrlId, description, undefined, metadata);

  return newUrlId;
}

export async function updateChatDescription(_db: any, id: string, description: string): Promise<void> {
  const chat = await getMessages(_db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  if (!description.trim()) {
    throw new Error('Description cannot be empty');
  }

  await setMessages(_db, id, chat.messages, chat.urlId, description, chat.timestamp, chat.metadata);
}

export async function updateChatMetadata(_db: any, id: string, metadata: IChatMetadata | undefined): Promise<void> {
  const chat = await getMessages(_db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  await setMessages(_db, id, chat.messages, chat.urlId, chat.description, chat.timestamp, metadata);
}

export async function getSnapshot(_db: any, chatId: string): Promise<Snapshot | undefined> {
  try {
    const response = await axios.get(`/api/snapshots/${chatId}`);

    return response as unknown as Snapshot;
  } catch (error) {
    // If snapshot not found, return undefined instead of throwing
    if ((error as any).response?.status === 404) {
      return undefined;
    }

    logger.error('Failed to fetch snapshot:', error);
    throw error;
  }
}

export async function setSnapshot(_db: any, chatId: string, snapshot: Snapshot): Promise<void> {
  try {
    await axios.post('/api/snapshots', {
      chatId,
      snapshot,
    });
  } catch (error) {
    logger.error('Failed to save snapshot:', error);
    throw error;
  }
}

export async function deleteSnapshot(_db: any, chatId: string): Promise<void> {
  try {
    await axios.delete(`/api/snapshots/${chatId}`);
  } catch (error) {
    // If snapshot not found, don't throw error (it's already deleted)
    if ((error as any).response?.status === 404) {
      return;
    }

    logger.error('Failed to delete snapshot:', error);
    throw error;
  }
}
