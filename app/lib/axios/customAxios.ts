/* eslint-disable @typescript-eslint/no-empty-function */

const AUTH_API_URL = process.env.AUTH_API_URL || 'https://dev-auth.widerml.com';
const ROOT_API_URL = process.env.API_ROOT_URL || 'https://dev-app.widerml.com';

import type { InternalAxiosRequestConfig } from 'axios';
import Axios, { AxiosHeaders } from 'axios';
import { deleteCookie, getCookie, setCookie } from 'cookies-next';

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  const newConfig = { ...config };
  const token = getCookie('wider_access_token');

  if (token) {
    if (!newConfig.headers) {
      newConfig.headers = new AxiosHeaders();
    }

    (newConfig.headers as AxiosHeaders).set('authorization', `Bearer ${token}`);
  }

  return newConfig;
}

const axios = Axios.create({
  // No baseURL needed for Remix - frontend and backend are same server
  headers: {
    'Content-Type': 'application/json',
  },
});

function setAuthBaseURL() {
  axios.defaults.baseURL = AUTH_API_URL;
}

function setRootBaseURL() {
  axios.defaults.baseURL = ROOT_API_URL;
}

axios.interceptors.request.use((config) => {
  return authRequestInterceptor(config);
});

axios.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest.retry) {
      originalRequest.retry = 0;
    }

    if (error.response && error.response.status === 401 && originalRequest.retry < 3) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(async (token) => {
            originalRequest.headers.authorization = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest.retry += 1;
      isRefreshing = true;

      const refreshToken = getCookie('wider_refresh_token');

      if (!refreshToken) {
        deleteCookie('wider_access_token');
        window.location.replace('/en/auth/sign-in');

        /*
         * return Promise.reject(error);
         * Prevent React from rendering an error
         */
        return new Promise(() => {}); // hang the request to block further rendering
      }

      try {
        const response: any = await axios.post('https://dev-auth.widerml.com/api/v1/token/refresh/', {
          refresh: refreshToken,
        });
        const { access } = response;
        setCookie('wider_access_token', access);
        processQueue(null, access);
        originalRequest.headers.authorization = `Bearer ${access}`;

        return await axios(originalRequest);
      } catch (retryError) {
        processQueue(retryError, null);
        deleteCookie('wider_access_token');

        // const URL = process.env.WIDER_APP_URL || 'https://dev.widerml.com';

        // window.location.replace(`${URL}/en/auth/sign-in?next=builder.widerml.com`);

        return await Promise.reject(retryError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { axios, setAuthBaseURL, setRootBaseURL };
