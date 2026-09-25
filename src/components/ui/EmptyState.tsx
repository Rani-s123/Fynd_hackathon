import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon ?? <Inbox className="h-8 w-8 text-steel-300 dark:text-steel-600" />}
      <p className="text-sm text-steel-500 dark:text-steel-400">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded border border-steel-300 px-3 py-1.5 text-sm text-steel-700 hover:bg-steel-100 focus:outline-none focus:ring-2 focus:ring-brass-500 dark:border-steel-600 dark:text-steel-300 dark:hover:bg-steel-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
