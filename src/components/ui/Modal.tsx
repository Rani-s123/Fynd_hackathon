import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-steel-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md animate-slide-down rounded-xl border border-steel-200 bg-white p-5 shadow-xl dark:border-steel-700 dark:bg-steel-800"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-steel-800 dark:text-steel-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-steel-400 transition-colors hover:bg-steel-100 hover:text-steel-600 focus:outline-none focus:ring-2 focus:ring-brass-500 dark:hover:bg-steel-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
