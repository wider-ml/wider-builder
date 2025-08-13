import { setCookie } from 'cookies-next';

import { axios, setAuthBaseURL } from '~/lib/auth/customAxios';

import type { ResponseWithToken, SignInDTO } from './type';

const SIGN_IN_URL = '/api/v1/auth/login/';

const signIn = async (data: SignInDTO): Promise<ResponseWithToken> => {
  try {
    setAuthBaseURL();

    const response: ResponseWithToken = await axios.post(SIGN_IN_URL, data);

    if (response) {
      const refreshToken = response?.refresh;
      const accessToken = response?.access;

      // Convert UNIX timestamps to JavaScript Date objects
      const accessExpiryDate =
        response?.access_expires_at !== undefined ? new Date(response.access_expires_at * 1000) : undefined;
      const refreshExpiryDate =
        response?.refresh_expires_at !== undefined ? new Date(response.refresh_expires_at * 1000) : undefined;

      setCookie('wider_refresh_token', refreshToken, {
        secure: true,
        sameSite: 'none',
        expires: refreshExpiryDate,
        domain: '.widerml.com',
      });
      setCookie('wider_access_token', accessToken, {
        secure: true,
        sameSite: 'none',
        expires: accessExpiryDate,
        domain: '.widerml.com',
      });
    }

    return response;
  } catch (error) {
    console.error('Sign In error:', error);
    throw error;
  }
};

const AUTH_ME_URL = () => `/api/v1/auth/profile/details/?language=en`;

const getUser = async (): Promise<any> => {
  try {
    setAuthBaseURL();

    const response: any = await axios.get(AUTH_ME_URL());

    return response;
  } catch (error) {
    console.error('User details fetch error:', error);
    throw error;
  }
};

export { getUser, signIn };
