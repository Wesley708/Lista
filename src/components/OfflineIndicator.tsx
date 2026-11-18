import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/60 px-4 py-2 text-xs font-medium text-amber-900 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Modo offline ativo — suas alterações ficam salvas neste aparelho.</span>
      </div>
    </div>
  );
};
