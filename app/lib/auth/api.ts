import { axios } from '~/lib/axios/customAxios';

const AUTH_ME_URL = () => `https://dev-auth.widerml.com/api/v1/auth/profile/details/?language=en`;

const getUser = async (): Promise<any> => {
  try {
    const response: any = await axios.get(AUTH_ME_URL());

    return response;
  } catch (error) {
    console.error('User details fetch error:', error);
    throw error;
  }
};

export { getUser };
