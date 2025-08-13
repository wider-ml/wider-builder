import { redirect } from '@remix-run/node';
import { parse } from 'cookie';

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

export async function requireAuth(request: Request) {
  const cookieHeader = request.headers.get('Cookie');

  const cookies = parse(cookieHeader || '');

  const accessToken = cookies.wider_access_token;

  const refreshToken = cookies.wider_refresh_token;

  if (!accessToken) {
    const URL = process.env.WIDER_APP_URL || 'https://dev.widerml.com';
    throw redirect(`${URL}/en/auth/sign-in`); // redirect if no token
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
