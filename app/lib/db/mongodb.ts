import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI =
  process.env.MONGODB_CONNECTION_STRING ||
  'mongodb+srv://widerml:wider1234@buldercluster.sbhizjq.mongodb.net/?retryWrites=true&w=majority&appName=bulderCluster';

export async function connectToDatabase(): Promise<Db> {
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 0,
    connectTimeoutMS: 10000,
    maxIdleTimeMS: 0,
    retryWrites: true,
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
  });
  await client.connect();

  return client.db('wider-builder');
}

export async function getChatsCollection(): Promise<Collection> {
  const database = await connectToDatabase();

  return database.collection('chats');
}

export async function getSnapshotsCollection(): Promise<Collection> {
  const database = await connectToDatabase();
  return database.collection('snapshots');
}
