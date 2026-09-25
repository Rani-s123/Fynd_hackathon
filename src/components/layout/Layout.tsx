import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-steel-100 dark:bg-steel-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-fade-in mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
