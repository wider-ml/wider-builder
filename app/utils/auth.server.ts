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
  const cookies = parseCookies(request.headers.get('Cookie'));
  const accessToken = cookies.wider_shared_access_token || cookies.wider_access_token;
  const refreshToken = cookies.wider_shared_refresh_token;

  if (!accessToken) {
    const URL = process.env.WIDER_APP_URL || 'https://app.widerml.com';
    throw redirect(`${URL}/en/auth/sign-in?next=builder.widerml.com`); // redirect if no token
  }

  return { accessToken, refreshToken };
}
