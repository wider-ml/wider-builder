// import { redirect } from '@remix-run/node';

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
  const access =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU2MDQ2NDg5LCJpYXQiOjE3NTU0NDE2ODksImp0aSI6IjRlYzFhZDA0YTRiMTQ4ZmU5Njg2NDc2MzliZmFiZDNmIiwidXNlcl9pZCI6ImZjZDg1OWE5LTZkM2QtNDk1My04NGU4LWU4NjA5NzE4ZDAwNiIsImhhc2hfcGFzc3dvcmQiOiI5ODkwN0FBMUU2NTkwNkFBNDlBM0Y5QUE1MEY0QjE5MSIsInV1aWQiOiJmY2Q4NTlhOS02ZDNkLTQ5NTMtODRlOC1lODYwOTcxOGQwMDYiLCJlbWFpbCI6ImlhbXRoZW11bm5hMTBAZ21haWwuY29tIiwibmFtZSI6IiIsImdyb3VwIjoiVXNlciIsImNvbXBhbnlfdXVpZCI6IiJ9.LDPjiS4oNIOsoVjpFBfAUEfwlgUrxBMs1LA4iNaojus';
  const refresh =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1ODAzMzY4OSwiaWF0IjoxNzU1NDQxNjg5LCJqdGkiOiIzYmFkZmExNGY3MzE0MTZlOGIyNzUwYTZlYmU0ODYyMSIsInVzZXJfaWQiOiJmY2Q4NTlhOS02ZDNkLTQ5NTMtODRlOC1lODYwOTcxOGQwMDYiLCJoYXNoX3Bhc3N3b3JkIjoiOTg5MDdBQTFFNjU5MDZBQTQ5QTNGOUFBNTBGNEIxOTEiLCJ1dWlkIjoiZmNkODU5YTktNmQzZC00OTUzLTg0ZTgtZTg2MDk3MThkMDA2IiwiZW1haWwiOiJpYW10aGVtdW5uYTEwQGdtYWlsLmNvbSIsIm5hbWUiOiIiLCJncm91cCI6IlVzZXIiLCJjb21wYW55X3V1aWQiOiIifQ.vwb8PAvPAt1OaMVbkCCRrtgadx44Uje8QtEizTjdEg0';

  const cookies = parseCookies(request.headers.get('Cookie'));
  const accessToken = cookies.wider_shared_access_token || access;
  const refreshToken = cookies.wider_shared_refresh_token || refresh;

  /*
   * if (!accessToken) {
   *   const URL = process.env.WIDER_APP_URL || 'https://dev.widerml.com';
   *   throw redirect(`${URL}/en/auth/sign-in?next=builder.widerml.com`); // redirect if no token
   * }
   */

  // Optional: verify token with your backend API

  // const isValid = await verifyToken(accessToken);

  /*
   * if (!isValid) {
   *   throw redirect(`${URL}//en/auth/sign-in`); // redirect if not valid
   * }
   */

  return { accessToken, refreshToken };
}
