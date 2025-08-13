import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { useChatHistory } from '~/lib/persistence';
import { DeployButton } from '~/components/deploy/DeployButton';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted: _chatStarted }: HeaderActionButtonsProps) {
  const { exportChat } = useChatHistory();

  // Removed the shouldShowButtons condition - buttons are always visible now

  return (
    <div className="flex items-center">
      {/* Always show ExportChatButton */}
      <ExportChatButton exportChat={exportChat} />

      {/* Always show DeployButton */}
      <DeployButton />
    </div>
  );
}
