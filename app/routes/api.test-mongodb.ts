import { json } from '@remix-run/cloudflare';
import { connectToDatabase } from '~/lib/db/mongodb';

export async function loader({ context }: { context: { cloudflare?: { env: Record<string, string> } } }) {
  try {
    // Test MongoDB connection
    const db = await connectToDatabase(context);
    const collections = await db.listCollections().toArray();

    return json({
      status: 'success',
      message: 'MongoDB connection successful',
      collections: collections.map((c) => c.name),
    });
  } catch (error) {
    console.error('MongoDB test failed:', error);
    return json(
      {
        status: 'error',
        message: 'MongoDB connection failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
