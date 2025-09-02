import { json, type ActionFunction } from '@remix-run/node';
import { createScopedLogger } from '~/utils/logger';
import { extractUserIdFromRequest } from '~/utils/auth.server';
import type { Snapshot } from '~/lib/persistence/types';

const logger = createScopedLogger('api.snapshots');

export interface SnapshotDocument {
  chatId: string;
  snapshot: Snapshot;
  createdAt: string;
}

// POST /api/snapshots - Create or update snapshot in Django API
export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = extractUserIdFromRequest(request);
    const { chatId, snapshot } = (await request.json()) as {
      chatId: string;
      snapshot: Snapshot;
    };
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return json({ error: 'No authorization token provided' }, { status: 401 });
    }

    if (!chatId || !snapshot) {
      return json({ error: 'Chat ID and snapshot data are required' }, { status: 400 });
    }

    const API_ROOT_URL = (context.cloudflare?.env as any)?.API_ROOT_URL || process.env.API_ROOT_URL;

    // Update the WebProject with snapshot data
    const webProjectData = {
      chat_id: chatId,
      snapshot_data: snapshot, // Store snapshot in snapshot_data field
    };

    console.log(`==== Snapshot posting to======${API_ROOT_URL}/api/v1/web-projects/${chatId}/`);

    // Send to Django API - using PATCH to update only snapshot_data field
    const response = await fetch(`${API_ROOT_URL}/api/v1/web-projects/${chatId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(webProjectData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to save snapshot in Django API: ${response.status} ${response.statusText} - ${errorText}`);
      return json({ error: 'Failed to save snapshot' }, { status: response.status });
    }

    const result = (await response.json()) as any;
    logger.info(`Snapshot for chat ${chatId} saved for user ${userId}`);

    return json({
      success: true,
      chatId,
      created: true,
      projectId: result.id,
    });
  } catch (error) {
    logger.error('Failed to save snapshot:', error);
    return json({ error: 'Failed to save snapshot' }, { status: 500 });
  }
};
