import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header className="flex items-center px-4 h-[var(--header-height)] relative z-10">
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="https://app.widerml.com/en/dashboard" className="text-2xl font-semibold text-accent flex items-center">
          {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
          <img src="/wider-logo-light.png" alt="Wider logo" className="w-[90px] inline-block dark:hidden" />
          <img src="/wider-logo-dark.png" alt="Wider logo" className="w-[90px] inline-block hidden dark:block" />

        </a>
      </div>

      {/* Show ChatDescription only when chat has started */}
      {chat.started && (
        <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
          <ClientOnly>{() => <ChatDescription />}</ClientOnly>
        </span>
      )}

      {/* Show buttons always, but add flex-1 when chat hasn't started to push buttons to the right */}
      {!chat.started && <div className="flex-1" />}

      {/* Always show HeaderActionButtons */}
      <ClientOnly>
        {() => (
          <div className="">
            <HeaderActionButtons chatStarted={chat.started} />
          </div>
        )}
      </ClientOnly>
    </header>
  );
}
