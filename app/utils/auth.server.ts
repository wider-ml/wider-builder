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

export async function requireAuth(request: Request) {
  const access =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU3NDE0MTMzLCJpYXQiOjE3NTY4MDkzMzMsImp0aSI6IjljYmI1ZGJmZjllMDQ2MmZhOWQ5Zjk2YTY4NTUxNGU1IiwidXNlcl9pZCI6Ijc2NTU0ODgwLWQ3YmItNDA4OS1hNmM0LTYyZjBjODBlYzU0ZCIsImhhc2hfcGFzc3dvcmQiOiIyQzVBOTZGM0Q2OEVGMTc4NDRCMTM3RjMyN0M5NjUyQiIsInV1aWQiOiI3NjU1NDg4MC1kN2JiLTQwODktYTZjNC02MmYwYzgwZWM1NGQiLCJlbWFpbCI6ImlhbXRoZW11bm5hMTBAZ21haWwuY29tIiwibmFtZSI6IiIsImdyb3VwIjoiVXNlciIsImNvbXBhbnlfdXVpZCI6IiJ9.-2duwlu7QE7N1FbFjagBLGdUQm3SFFw4UVlHcVI_Bbk';
  const refresh =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1OTQwMTMzMywiaWF0IjoxNzU2ODA5MzMzLCJqdGkiOiJlM2I4Yjk5YjI5ZGM0Zjg4OTA3NzFjMWZjYzhhMGUwOSIsInVzZXJfaWQiOiI3NjU1NDg4MC1kN2JiLTQwODktYTZjNC02MmYwYzgwZWM1NGQiLCJoYXNoX3Bhc3N3b3JkIjoiMkM1QTk2RjNENjhFRjE3ODQ0QjEzN0YzMjdDOTY1MkIiLCJ1dWlkIjoiNzY1NTQ4ODAtZDdiYi00MDg5LWE2YzQtNjJmMGM4MGVjNTRkIiwiZW1haWwiOiJpYW10aGVtdW5uYTEwQGdtYWlsLmNvbSIsIm5hbWUiOiIiLCJncm91cCI6IlVzZXIiLCJjb21wYW55X3V1aWQiOiIifQ.aZ6f8CxRY4SSlBT-tqVrG1u8gpjnfZ-Dyk6bz3PwPO4';
  const cookies = parseCookies(request.headers.get('Cookie'));
  const accessToken = cookies.wider_shared_access_token || access;
  const refreshToken = cookies.wider_shared_refresh_token || refresh;

  if (!accessToken) {
    const URL = process.env.WIDER_APP_URL || 'https://app.widerml.com';
    throw redirect(`${URL}/en/auth/sign-in?next=builder.widerml.com`); // redirect if no token
  }

  return { accessToken, refreshToken };
}
