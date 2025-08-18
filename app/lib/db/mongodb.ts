import { MongoClient, Db, Collection } from 'mongodb';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('MongoDB');

/*
 * MongoDB connection string
 * const MONGODB_URI =
 *   'mongodb+srv://iamthemunna10:wider12345@munna-cluster.d248zqq.mongodb.net/wider-builder?retryWrites=true&w=majority&appName=munna-cluster';
 */

const MONGODB_URI = process.env.MOONGODB_CONNECTION_STRING;

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  if (!MONGODB_URI) {
    logger.error('MongoDB connection string is not defined');
    throw new Error('MongoDB connection string is not defined');
  }

  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }

    await client.connect();
    db = client.db('wider-builder');

    logger.info('Connected to MongoDB successfully');

    return db;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw new Error('Database connection failed');
  }
}

export async function getChatsCollection(): Promise<Collection> {
  const database = await connectToDatabase();
  return database.collection('chats');
}

export async function getSnapshotsCollection(): Promise<Collection> {
  const database = await connectToDatabase();
  return database.collection('snapshots');
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});
