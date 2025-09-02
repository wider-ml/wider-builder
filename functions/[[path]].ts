import type { ServerBuild } from '@remix-run/cloudflare';
import { createPagesFunctionHandler } from '@remix-run/cloudflare-pages';

export const onRequest: PagesFunction = async (context) => {
  let serverBuild: ServerBuild;

  try {
    // Use dynamic import with string to avoid TypeScript compile-time checking
    const buildPath = '../build/server';
    serverBuild = (await import(buildPath)) as unknown as ServerBuild;
  } catch {
    // Handle case where build doesn't exist yet
    throw new Response('Server build not found. Please run the build process first.', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }

  const handler = createPagesFunctionHandler({
    build: serverBuild,
  });

  return handler(context);
};
