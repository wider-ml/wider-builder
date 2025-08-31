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
  /*
   * const access =
   *   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU2MDk3MDYzLCJpYXQiOjE3NTU0OTIyNjMsImp0aSI6IjZmY2JlZDQyOGNiZDQ1Y2Q5NThiZjg0NzY5Zjg2YjljIiwidXNlcl9pZCI6IjAzYzk2ZTFhLTljMjctNGJlNC05ZTkxLTBlYTU5NTQwN2MzOCIsImhhc2hfcGFzc3dvcmQiOiI1Rjg1MDA2NEE1NThEMDE4ODY3QzM1QjgzMjU1QjkwMCJ9.unvBSaLoBqEof1KOT5KEOSEQQyWVtWGIT9Prux2UyZY';
   * const refresh =
   *   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1ODA4NDI2MywiaWF0IjoxNzU1NDkyMjYzLCJqdGkiOiIyOGRiNTgyMGNjZGM0MjgwOWM3OGM5ZDFhMmVkZjI1NCIsInVzZXJfaWQiOiIwM2M5NmUxYS05YzI3LTRiZTQtOWU5MS0wZWE1OTU0MDdjMzgiLCJoYXNoX3Bhc3N3b3JkIjoiNUY4NTAwNjRBNTU4RDAxODg2N0MzNUI4MzI1NUI5MDAifQ.4l8I3EuEQziFb5c7F0kC6AyKrFhqfMIIBdGg5VOMcqM';
   */

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
