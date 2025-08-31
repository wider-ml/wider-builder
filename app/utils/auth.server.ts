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
  let access = '';
  let refresh = '';
  // let refresh =
  //   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1OTA3ODIwMSwiaWF0IjoxNzU2NDg2MjAxLCJqdGkiOiI3N2RiY2E2ZmZmYjE0NDZiYjc5NjEwNmFlZDA2NjYzMiIsInVzZXJfaWQiOiJhNDgxZDU1Ni0yM2VmLTQ5MDUtODg4OC02NzU4OTExZDQyNmYiLCJoYXNoX3Bhc3N3b3JkIjoiMjFBRUUxMzAzRUNFNzRERDNBMDREMkNDNzRDNjg5NjQiLCJ1dWlkIjoiYTQ4MWQ1NTYtMjNlZi00OTA1LTg4ODgtNjc1ODkxMWQ0MjZmIiwiZW1haWwiOiJoYXJ1bjEzOTNAZ21haWwuY29tIiwibmFtZSI6IiIsImdyb3VwIjoiVXNlciIsImNvbXBhbnlfdXVpZCI6IiJ9._kLpMdlLqtmQ-8vZKdtC00K8h-YNeB94yC_Q8u9TvhY';
  // let access =
  //   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU3MDkxMDAxLCJpYXQiOjE3NTY0ODYyMDEsImp0aSI6IjA4YTQxZGZkNjU3ODRhY2Q4ZjZiY2FjZGYyZGM0ZDc2IiwidXNlcl9pZCI6ImE0ODFkNTU2LTIzZWYtNDkwNS04ODg4LTY3NTg5MTFkNDI2ZiIsImhhc2hfcGFzc3dvcmQiOiIyMUFFRTEzMDNFQ0U3NEREM0EwNEQyQ0M3NEM2ODk2NCIsInV1aWQiOiJhNDgxZDU1Ni0yM2VmLTQ5MDUtODg4OC02NzU4OTExZDQyNmYiLCJlbWFpbCI6ImhhcnVuMTM5M0BnbWFpbC5jb20iLCJuYW1lIjoiIiwiZ3JvdXAiOiJVc2VyIiwiY29tcGFueV91dWlkIjoiIn0.aoAJzzpJtGOzf4pMoTpIllXkJzdw6YgUgC7lI-9x2jc';

  const cookies = parseCookies(request.headers.get('Cookie'));
  const accessToken = cookies.wider_shared_access_token || access;
  const refreshToken = cookies.wider_shared_refresh_token || refresh;

  if (!accessToken) {
    const URL = process.env.WIDER_APP_URL || 'https://app.widerml.com';
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
