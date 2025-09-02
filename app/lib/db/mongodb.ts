import { MongoClient, Db, Collection } from 'mongodb';
import { execSync } from 'child_process';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('MongoDB');

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(context: any): Promise<Db> {
  if (db) {
    return db;
  }

  const MONGODB_URI = context?.cloudflare?.env.MONGODB_URI || process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    logger.error('MongoDB connection string is not defined');
    throw new Error('MongoDB connection string is not defined');
  }

  console.log('MONGODB_URI:', MONGODB_URI);

  try {
    if (!client) {
      // Determine if we're connecting to a local MongoDB or Atlas
      const isLocalMongoDB = MONGODB_URI.includes('mongodb://') && !MONGODB_URI.includes('mongodb.net');

      const clientOptions: any = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 0,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 0,
        retryWrites: true,
      };

      // Only add TLS options for Atlas connections
      if (!isLocalMongoDB) {
        clientOptions.tls = true;
        clientOptions.tlsAllowInvalidCertificates = false;
        clientOptions.tlsAllowInvalidHostnames = false;
      }

      client = new MongoClient(MONGODB_URI, clientOptions);
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

export async function getChatsCollection(context: any): Promise<Collection> {
  const database = await connectToDatabase(context);

  return database.collection('chats');
}

export async function getSnapshotsCollection(context: any): Promise<Collection> {
  const database = await connectToDatabase(context);
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
