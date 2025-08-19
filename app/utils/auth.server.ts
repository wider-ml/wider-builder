import { redirect } from '@remix-run/node';

/*
 * async function verifyToken(token: string) {
 *   const AUTH_URL = process.env.API_AUTH_URL;
 *   const mainURL = `${AUTH_URL}/api/v1/auth/profile/details/?language=en}`;
 *   const res = await fetch(mainURL, {
 *     headers: { Authorization: `Bearer ${token}` },
 *   });
 */

/*
 *   console.log('Token verification response:', res.status, res.statusText);
 *   console.log('res okat:', res.ok);
 */

/*
 *   return res.ok;
 * }
 */

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
  const accessToken = cookies.wider_shared_access_token;
  const refreshToken = cookies.wider_shared_refresh_token;

  if (!accessToken) {
    const URL = process.env.WIDER_APP_URL || 'https://dev.widerml.com';
    throw redirect(`${URL}/en/auth/sign-in?next=builder.widerml.com`); // redirect if no token
  }

  // Optional: verify token with your backend API

  // const isValid = await verifyToken(accessToken);

  /*
   * if (!isValid) {
   *   throw redirect(`${URL}//en/auth/sign-in`); // redirect if not valid
   * }
   */

  return { accessToken, refreshToken };
}
