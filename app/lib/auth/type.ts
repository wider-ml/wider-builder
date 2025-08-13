interface SignInDTO {
  email: string;
  password: string;
  locale?: string;
  site: string;
}

interface SignIn {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ResponseWithToken {
  access: string;
  refresh: string;
  access_expires_at: number;
  refresh_expires_at: number;
}

export type { ResponseWithToken, SignIn, SignInDTO };
