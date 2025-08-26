import { MongoClient, Db, Collection } from 'mongodb';
import { execSync } from 'child_process';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('MongoDB');

// Function to get MongoDB URI from environment
function getMongoDBURI(context?: { cloudflare?: { env: Record<string, string> } }): string {
  // Try to get from Wrangler context first (for production)
  const serverEnv = context?.cloudflare?.env || (process.env as Record<string, string>);

  console.log('========== MongoDB Environment Variables ==========', context?.cloudflare?.MONGODB_URI);

  let mongodbUri =
    serverEnv.MONGODB_URI ||
    serverEnv.MONGODB_CONNECTION_STRING ||
    process.env.MONGODB_URI ||
    process.env.MONGODB_CONNECTION_STRING;

  console.log('MongoDB Environment Debug:', {
    hasServerEnvMongoDB_URI: !!serverEnv.MONGODB_URI,
    hasServerEnvMongoDB_CONNECTION_STRING: !!serverEnv.MONGODB_CONNECTION_STRING,
    hasProcessEnvMongoDB_URI: !!process.env.MONGODB_URI,
    hasProcessEnvMongoDB_CONNECTION_STRING: !!process.env.MONGODB_CONNECTION_STRING,
    mongodbUri: mongodbUri ? 'Found' : 'Not found',
    processEnvKeys: Object.keys(process.env).filter((key) => key.includes('MONGO')),
    processEnvCount: Object.keys(process.env).length,
  });

  // If not found in process.env, try execSync fallback (for Docker environments)
  if (!mongodbUri) {
    try {
      const envOutput = execSync('printenv', { encoding: 'utf8' });
      const envLines = envOutput.split('\n');
      for (const line of envLines) {
        if (line.startsWith('MONGODB_URI=')) {
          mongodbUri = line.substring('MONGODB_URI='.length);
          console.log('Found MONGODB_URI via execSync:', mongodbUri ? 'Yes' : 'No');
          break;
        } else if (line.startsWith('MONGODB_CONNECTION_STRING=')) {
          mongodbUri = line.substring('MONGODB_CONNECTION_STRING='.length);
          console.log('Found MONGODB_CONNECTION_STRING via execSync:', mongodbUri ? 'Yes' : 'No');
          break;
        }
      }
    } catch (execError) {
      console.error('Error executing printenv for MongoDB:', execError);
    }
  }

  const finalUri =
    mongodbUri ||
    // Default to local MongoDB for development/production
    'mongodb://admin:IntInmoLeWDr@localhost:27017/builderDB?authSource=admin';

  console.log('Final MongoDB URI:', finalUri);
  return finalUri;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(context?: { cloudflare?: { env: Record<string, string> } }): Promise<Db> {
  if (db) {
    return db;
  }

  const MONGODB_URI = getMongoDBURI(context);

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

export async function getChatsCollection(context?: {
  cloudflare?: { env: Record<string, string> };
}): Promise<Collection> {
  const database = await connectToDatabase(context);

  return database.collection('chats');
}

export async function getSnapshotsCollection(context?: {
  cloudflare?: { env: Record<string, string> };
}): Promise<Collection> {
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
