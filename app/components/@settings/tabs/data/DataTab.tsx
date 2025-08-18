import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { ConfirmationDialog, SelectionDialog } from '~/components/ui/Dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/Card';
import { motion } from 'framer-motion';
import { useDataOperations } from '~/lib/hooks/useDataOperations';
import { openDatabase } from '~/lib/persistence/db';
import type { Chat } from '~/lib/persistence/chats';
import { DataVisualization } from './DataVisualization';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

// Create a custom hook for MongoDB-based database connection
function useBoltHistoryDB() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true);

        const connected = await openDatabase();
        setIsConnected(connected);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error initializing database'));
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  return { isConnected, isLoading, error };
}

// Extend the Chat interface to include the missing properties
interface ExtendedChat extends Chat {
  title?: string;
  updatedAt?: number;
}

interface SettingsCategory {
  id: string;
  label: string;
  description: string;
}

interface ChatItem {
  id: string;
  label: string;
  description: string;
}

export function DataTab() {
  // Use our custom hook for the boltHistory database
  const { isConnected, isLoading: dbLoading } = useBoltHistoryDB();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyFileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // State for confirmation dialogs
  const [showResetInlineConfirm, setShowResetInlineConfirm] = useState(false);
  const [showDeleteInlineConfirm, setShowDeleteInlineConfirm] = useState(false);
  const [showSettingsSelection, setShowSettingsSelection] = useState(false);
  const [showChatsSelection, setShowChatsSelection] = useState(false);

  // State for settings categories and available chats
  const [settingsCategories] = useState<SettingsCategory[]>([
    { id: 'core', label: 'Core Settings', description: 'User profile and main settings' },
    { id: 'providers', label: 'Providers', description: 'API keys and provider configurations' },
    { id: 'features', label: 'Features', description: 'Feature flags and settings' },
    { id: 'ui', label: 'UI', description: 'UI configuration and preferences' },
    { id: 'connections', label: 'Connections', description: 'External service connections' },
    { id: 'debug', label: 'Debug', description: 'Debug settings and logs' },
    { id: 'updates', label: 'Updates', description: 'Update settings and notifications' },
  ]);

  const [availableChats, setAvailableChats] = useState<ExtendedChat[]>([]);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);

  // Function to load chats using API calls (MongoDB)
  const loadChats = useCallback(async () => {
    try {
      console.log('Loading chats from MongoDB via API');

      /*
       * Since we're using MongoDB via API calls, we'll use the data operations hook
       * For now, we'll set empty arrays since the actual chat loading will be handled
       * by the useDataOperations hook when needed
       */
      setAvailableChats([]);
      setChatItems([]);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error('Failed to load chats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, []);

  // Data operations hook - no database needed for MongoDB API calls
  const {
    isExporting,
    isImporting,
    isResetting,
    isDownloadingTemplate,
    handleExportSettings,
    handleExportSelectedSettings,
    handleExportAllChats,
    handleExportSelectedChats,
    handleImportSettings,
    handleImportChats,
    handleResetSettings,
    handleResetChats,
    handleDownloadTemplate,
    handleImportAPIKeys,
  } = useDataOperations({
    onReloadSettings: () => window.location.reload(),
    onReloadChats: () => {
      // Reload chats after reset - using API calls now
      loadChats();
    },
    onResetSettings: () => setShowResetInlineConfirm(false),
    onResetChats: () => setShowDeleteInlineConfirm(false),
  });

  // Loading states for operations not provided by the hook
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportingKeys, setIsImportingKeys] = useState(false);

  // Load available chats when connected
  useEffect(() => {
    if (isConnected) {
      loadChats();
    }
  }, [isConnected, loadChats]);

  // Handle file input changes
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        handleImportSettings(file);
      }
    },
    [handleImportSettings],
  );

  const handleAPIKeyFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        setIsImportingKeys(true);
        handleImportAPIKeys(file).finally(() => setIsImportingKeys(false));
      }
    },
    [handleImportAPIKeys],
  );

  const handleChatFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        handleImportChats(file);
      }
    },
    [handleImportChats],
  );

  // Wrapper for reset chats to handle loading state
  const handleResetChatsWithState = useCallback(() => {
    setIsDeleting(true);
    handleResetChats().finally(() => setIsDeleting(false));
  }, [handleResetChats]);

  return (
    <div className="space-y-12">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileInputChange} className="hidden" />
      <input
        ref={apiKeyFileInputRef}
        type="file"
        accept=".json"
        onChange={handleAPIKeyFileInputChange}
        className="hidden"
      />
      <input
        ref={chatFileInputRef}
        type="file"
        accept=".json"
        onChange={handleChatFileInputChange}
        className="hidden"
      />

      {/* Reset Settings Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetInlineConfirm}
        onClose={() => setShowResetInlineConfirm(false)}
        title="Reset All Settings?"
        description="This will reset all your settings to their default values. This action cannot be undone."
        confirmLabel="Reset Settings"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isResetting}
        onConfirm={handleResetSettings}
      />

      {/* Delete Chats Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteInlineConfirm}
        onClose={() => setShowDeleteInlineConfirm(false)}
        title="Delete All Chats?"
        description="This will permanently delete all your chat history. This action cannot be undone."
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleResetChatsWithState}
      />

      {/* Settings Selection Dialog */}
      <SelectionDialog
        isOpen={showSettingsSelection}
        onClose={() => setShowSettingsSelection(false)}
        title="Select Settings to Export"
        items={settingsCategories}
        onConfirm={(selectedIds) => {
          handleExportSelectedSettings(selectedIds);
          setShowSettingsSelection(false);
        }}
        confirmLabel="Export Selected"
      />

      {/* Chats Selection Dialog */}
      <SelectionDialog
        isOpen={showChatsSelection}
        onClose={() => setShowChatsSelection(false)}
        title="Select Chats to Export"
        items={chatItems}
        onConfirm={(selectedIds) => {
          handleExportSelectedChats(selectedIds);
          setShowChatsSelection(false);
        }}
        confirmLabel="Export Selected"
      />

      {/* Chats Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-bolt-elements-textPrimary">Chats</h2>
        {dbLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="i-ph-spinner-gap-bold animate-spin w-6 h-6 mr-2" />
            <span>Loading chats database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <div className="i-ph-download-duotone w-5 h-5" />
                  </motion.div>
                  <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                    Export All Chats
                  </CardTitle>
                </div>
                <CardDescription>Export all your chats to a JSON file.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={async () => {
                      try {
                        if (!isConnected) {
                          toast.error('Database not connected');
                          return;
                        }

                        console.log('Exporting chats from MongoDB via API');

                        if (availableChats.length === 0) {
                          toast.warning('No chats available to export');
                          return;
                        }

                        await handleExportAllChats();
                      } catch (error) {
                        console.error('Error exporting chats:', error);
                        toast.error(
                          `Failed to export chats: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        );
                      }
                    }}
                    disabled={isExporting || availableChats.length === 0}
                    variant="outline"
                    size="sm"
                    className={classNames(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                      isExporting || availableChats.length === 0 ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isExporting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                        Exporting...
                      </>
                    ) : availableChats.length === 0 ? (
                      'No Chats to Export'
                    ) : (
                      'Export All'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <div className="i-ph:list-checks w-5 h-5" />
                  </motion.div>
                  <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                    Export Selected Chats
                  </CardTitle>
                </div>
                <CardDescription>Choose specific chats to export.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={() => setShowChatsSelection(true)}
                    disabled={isExporting || chatItems.length === 0}
                    variant="outline"
                    size="sm"
                    className={classNames(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                      isExporting || chatItems.length === 0 ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isExporting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                        Exporting...
                      </>
                    ) : (
                      'Select Chats'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <div className="i-ph-upload-duotone w-5 h-5" />
                  </motion.div>
                  <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                    Import Chats
                  </CardTitle>
                </div>
                <CardDescription>Import chats from a JSON file.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isImporting}
                    variant="outline"
                    size="sm"
                    className={classNames(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                      isImporting ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isImporting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                        Importing...
                      </>
                    ) : (
                      'Import Chats'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <motion.div
                    className="text-red-500 dark:text-red-400 mr-2"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div className="i-ph-trash-duotone w-5 h-5" />
                  </motion.div>
                  <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                    Delete All Chats
                  </CardTitle>
                </div>
                <CardDescription>Delete all your chat history.</CardDescription>
              </CardHeader>
              <CardFooter>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                  <Button
                    onClick={() => setShowDeleteInlineConfirm(true)}
                    disabled={isDeleting || chatItems.length === 0}
                    variant="outline"
                    size="sm"
                    className={classNames(
                      'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                      isDeleting || chatItems.length === 0 ? 'cursor-not-allowed' : '',
                    )}
                  >
                    {isDeleting ? (
                      <>
                        <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                        Deleting...
                      </>
                    ) : (
                      'Delete All'
                    )}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-bolt-elements-textPrimary">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center mb-2">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-download-duotone w-5 h-5" />
                </motion.div>
                <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                  Export All Settings
                </CardTitle>
              </div>
              <CardDescription>Export all your settings to a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={handleExportSettings}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className={classNames(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                    isExporting ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isExporting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                      Exporting...
                    </>
                  ) : (
                    'Export All'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center mb-2">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-filter-duotone w-5 h-5" />
                </motion.div>
                <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                  Export Selected Settings
                </CardTitle>
              </div>
              <CardDescription>Choose specific settings to export.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => setShowSettingsSelection(true)}
                  disabled={isExporting || settingsCategories.length === 0}
                  variant="outline"
                  size="sm"
                  className={classNames(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                    isExporting || settingsCategories.length === 0 ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isExporting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                      Exporting...
                    </>
                  ) : (
                    'Select Settings'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center mb-2">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-upload-duotone w-5 h-5" />
                </motion.div>
                <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                  Import Settings
                </CardTitle>
              </div>
              <CardDescription>Import settings from a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  variant="outline"
                  size="sm"
                  className={classNames(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                    isImporting ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isImporting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                      Importing...
                    </>
                  ) : (
                    'Import Settings'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center mb-2">
                <motion.div
                  className="text-red-500 dark:text-red-400 mr-2"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="i-ph-arrow-counter-clockwise-duotone w-5 h-5" />
                </motion.div>
                <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                  Reset All Settings
                </CardTitle>
              </div>
              <CardDescription>Reset all settings to their default values.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => setShowResetInlineConfirm(true)}
                  disabled={isResetting}
                  variant="outline"
                  size="sm"
                  className={classNames(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                    isResetting ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isResetting ? (
                    <>
                      <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                      Resetting...
                    </>
                  ) : (
                    'Reset All'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* API Keys Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-bolt-elements-textPrimary">API Keys</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center mb-2">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-file-text-duotone w-5 h-5" />
                </motion.div>
                <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                  Download Template
                </CardTitle>
              </div>
              <CardDescription>Download a template file for your API keys.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  variant="outline"
                  size="sm"
                  className={classNames(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                    isDownloadingTemplate ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isDownloadingTemplate ? (
                    <>
                      <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                      Downloading...
                    </>
                  ) : (
                    'Download'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center mb-2">
                <motion.div className="text-accent-500 mr-2" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <div className="i-ph-upload-duotone w-5 h-5" />
                </motion.div>
                <CardTitle className="text-lg group-hover:text-bolt-elements-item-contentAccent transition-colors">
                  Import API Keys
                </CardTitle>
              </div>
              <CardDescription>Import API keys from a JSON file.</CardDescription>
            </CardHeader>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                <Button
                  onClick={() => apiKeyFileInputRef.current?.click()}
                  disabled={isImportingKeys}
                  variant="outline"
                  size="sm"
                  className={classNames(
                    'hover:text-bolt-elements-item-contentAccent hover:border-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-item-backgroundAccent transition-colors w-full justify-center',
                    isImportingKeys ? 'cursor-not-allowed' : '',
                  )}
                >
                  {isImportingKeys ? (
                    <>
                      <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
                      Importing...
                    </>
                  ) : (
                    'Import Keys'
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Data Visualization */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-bolt-elements-textPrimary">Data Usage</h2>
        <Card>
          <CardContent className="p-5">
            <DataVisualization chats={availableChats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
