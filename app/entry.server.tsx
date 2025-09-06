import 'dotenv/config';
import type { AppLoadContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { renderToString } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';
import { I18nextProvider } from 'react-i18next';
import { createServerI18n } from './i18n.server';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // await initializeModelList({});

  const i18n = createServerI18n();

  const head = renderHeadToString({ request, remixContext, Head });
  const body = renderToString(
    <I18nextProvider i18n={i18n}>
      <RemixServer context={remixContext} url={request.url} />
    </I18nextProvider>,
  );

  const html = `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">${body}</div></body></html>`;

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(html, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
