import { redirect } from '@remix-run/node';

function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    cookies[name.trim()] = rest.join('=').trim();
  });

  return cookies;
}

export function extractUserIdFromRequest(request: Request): string {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Decode JWT token (without verification for now)
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));

    if (!payload || !payload.user_id) {
      throw new Error('Invalid token structure');
    }

    return payload.user_id;
  } catch (error) {
    console.error('Failed to extract user ID from token:', error);
    throw new Error('Invalid or expired token');
  }
}

export async function requireAuth(request: Request, context: any) {
  /*
   * const access =
   *   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU3NjQ0OTk2LCJpYXQiOjE3NTcwNDAxOTYsImp0aSI6ImNiNTQ5ODMwMGIzMDQ5Nzk4Mjg2ZjRmZTQ3NWQxMTE4IiwidXNlcl9pZCI6Ijc2NTU0ODgwLWQ3YmItNDA4OS1hNmM0LTYyZjBjODBlYzU0ZCIsImhhc2hfcGFzc3dvcmQiOiIyQzVBOTZGM0Q2OEVGMTc4NDRCMTM3RjMyN0M5NjUyQiIsInV1aWQiOiI3NjU1NDg4MC1kN2JiLTQwODktYTZjNC02MmYwYzgwZWM1NGQiLCJlbWFpbCI6ImlhbXRoZW11bm5hMTBAZ21haWwuY29tIiwibmFtZSI6IiIsImdyb3VwIjoiVXNlciIsImNvbXBhbnlfdXVpZCI6IiJ9.RJsIedUQ3GThvEEFivdI948Xl4HLIOx7OkSKDEd8TEI';
   */
  /*
   * const refresh =
   *   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1OTYzMjE5NiwiaWF0IjoxNzU3MDQwMTk2LCJqdGkiOiJjZjczMjUxNzI4M2Q0NDRmYmViMWI2ZjUyMGZmYTcxMyIsInVzZXJfaWQiOiI3NjU1NDg4MC1kN2JiLTQwODktYTZjNC02MmYwYzgwZWM1NGQiLCJoYXNoX3Bhc3N3b3JkIjoiMkM1QTk2RjNENjhFRjE3ODQ0QjEzN0YzMjdDOTY1MkIiLCJ1dWlkIjoiNzY1NTQ4ODAtZDdiYi00MDg5LWE2YzQtNjJmMGM4MGVjNTRkIiwiZW1haWwiOiJpYW10aGVtdW5uYTEwQGdtYWlsLmNvbSIsIm5hbWUiOiIiLCJncm91cCI6IlVzZXIiLCJjb21wYW55X3V1aWQiOiIifQ.Cug0PWHgAirk4dYcdIp6Ls6tMGB3K9SoEqCtwTY2CCc';
   */
  const cookies = parseCookies(request.headers.get('Cookie'));
  const accessToken = cookies.wider_access_token || cookies.wider_shared_access_token;
  const refreshToken = cookies.wider_access_token || cookies.wider_shared_refresh_token;
  const widerAppUrl = process.env.WIDER_APP_URL || context?.cloudflare?.env.WIDER_APP_URL;
  const builderAppUrl = process.env.OWN_APP_URL || context?.cloudflare?.env.OWN_APP_URL;

  if (!accessToken) {
    throw redirect(`${widerAppUrl}/en/auth/sign-in?next=${builderAppUrl}`); // redirect if no token
  }

  return { accessToken, refreshToken };
}
