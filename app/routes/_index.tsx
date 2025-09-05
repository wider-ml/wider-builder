import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { requireAuth } from '~/utils/auth.server';
import { setCookie } from 'cookies-next';
import { useEffect } from 'react';
import { initializeUser } from '~/lib/stores/user';

export const meta: MetaFunction = () => {
  return [
    { title: 'Wider App Builder' },
    { name: 'description', content: 'Talk with Wider App Builder, an AI assistant from Wider ML' },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { accessToken, refreshToken } = await requireAuth(request, context);

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Landing page component for Bolt
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  const { accessToken, refreshToken } = useLoaderData<typeof loader>();

  if (accessToken && refreshToken) {
    setCookie('wider_refresh_token', refreshToken, {
      secure: true,
      sameSite: 'lax',
    });
    setCookie('wider_access_token', accessToken, {
      secure: true,
      sameSite: 'lax',
    });
  }

  // Initialize user data when tokens are available
  useEffect(() => {
    if (accessToken && refreshToken) {
      // Small delay to ensure cookies are set
      setTimeout(() => {
        initializeUser();
      }, 100);
    }
  }, [accessToken, refreshToken]);

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
