export interface AWSUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AWSAmplifyApp {
  appId: string;
  appArn: string;
  name: string;
  description?: string;
  repository?: string;
  platform: string;
  createTime: string;
  updateTime: string;
  defaultDomain: string;
  enableBranchAutoBuild: boolean;
  enableBasicAuth: boolean;
}

export interface AWSAmplifyStats {
  apps: AWSAmplifyApp[];
  totalApps: number;
}

export interface AWSConnection {
  user: AWSUser | null;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  stats?: AWSAmplifyStats;
}

export interface AWSAmplifyAppInfo {
  appId: string;
  name: string;
  url: string;
  chatId: string;
}
