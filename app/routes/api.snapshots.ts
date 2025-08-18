import { json, type ActionFunction } from '@remix-run/node';
import { getSnapshotsCollection } from '~/lib/db/mongodb';
import { createScopedLogger } from '~/utils/logger';
import type { Snapshot } from '~/lib/persistence/types';

const logger = createScopedLogger('api.snapshots');

export interface SnapshotDocument {
  _id?: string;
  chatId: string;
  snapshot: Snapshot;
  createdAt: string;
}

// POST /api/snapshots - Create or update snapshot
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { chatId, snapshot } = (await request.json()) as {
      chatId: string;
      snapshot: Snapshot;
    };

    if (!chatId || !snapshot) {
      return json({ error: 'Chat ID and snapshot data are required' }, { status: 400 });
    }

    const collection = await getSnapshotsCollection();

    const document: SnapshotDocument = {
      chatId,
      snapshot,
      createdAt: new Date().toISOString(),
    };

    // Use upsert to create or update
    const result = await collection.replaceOne({ chatId }, document, { upsert: true });

    logger.info(`Snapshot for chat ${chatId} ${result.upsertedId ? 'created' : 'updated'}`);

    return json({
      success: true,
      chatId,
      created: !!result.upsertedId,
    });
  } catch (error) {
    logger.error('Failed to save snapshot:', error);
    return json({ error: 'Failed to save snapshot' }, { status: 500 });
  }
};
