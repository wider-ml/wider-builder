import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';
import { requireAuth } from '~/utils/auth.server';

export async function loader(args: LoaderFunctionArgs) {
  const { accessToken, refreshToken } = await requireAuth(args.request);
  return json({ id: args.params.id, accessToken, refreshToken });
}

export default IndexRoute;
