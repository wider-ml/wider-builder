import { json, type LoaderFunction } from '@remix-run/node';
import { getSnapshotsCollection } from '~/lib/db/mongodb';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.snapshots.$chatId');

// GET /api/snapshots/:chatId - Get snapshot by chat ID
export const loader: LoaderFunction = async ({ params }) => {
  const { chatId } = params;

  if (!chatId) {
    return json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const collection = await getSnapshotsCollection();
    const snapshotDoc = await collection.findOne({ chatId });

    if (!snapshotDoc) {
      return json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Return just the snapshot data
    return json(snapshotDoc.snapshot);
  } catch (error) {
    logger.error('Failed to fetch snapshot:', error);
    return json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
};
