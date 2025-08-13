/* eslint-disable @typescript-eslint/naming-convention */
import { configureAuth } from 'react-query-auth';
import { getCookie } from 'cookies-next';
import { getUser, signIn } from './api';
import type { SignInDTO } from './type';

async function userFn() {
  const token = getCookie('wider_access_token');

  if (token) {
    const data = await getUser();
    return data;
  }

  return null;
}

async function loginFn(data: SignInDTO) {
  const response = await signIn(data);
  window.location.replace(`/`);

  return response;
}

async function logoutFn() {
  // If you don't have a logout API, just clear cookies here
  document.cookie = 'wider_access_token=; Max-Age=0';
  document.cookie = 'wider_refresh_token=; Max-Age=0';
  window.location.href = '/signin';
}

async function registerFn() {
  return null;
}

const authConfig = {
  userFn,
  loginFn,
  logoutFn,
  registerFn,
};

export const { useLogin, useUser, useLogout, AuthLoader, useRegister } = configureAuth(authConfig);
