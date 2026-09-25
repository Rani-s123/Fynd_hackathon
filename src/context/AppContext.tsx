import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { Role, Theme } from '@/types';
import { api } from '@/api';

interface AppCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  currentUser: Role;
  setCurrentUser: (r: Role) => void;
  unreadEscalations: number;
  clearNotifications: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [currentUser, setCurrentUserRole] = useState<Role>('Field Engineer');
  const [unreadEscalations, setUnread] = useState(0);
  // Tracks alert ids we've already surfaced, so the badge only counts alerts
  // that are genuinely new since the last time it was cleared -- not a
  // hardcoded starting number.
  const seenAlertIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const alerts = await api.getAlerts();
        if (cancelled) return;
        const ids = new Set(alerts.map((a) => a.id));
        if (seenAlertIds.current === null) {
          // First load: whatever alerts already exist are not "new".
          seenAlertIds.current = ids;
          return;
        }
        const newOnes = [...ids].filter((id) => !seenAlertIds.current!.has(id));
        if (newOnes.length > 0) {
          setUnread((u) => u + newOnes.length);
          newOnes.forEach((id) => seenAlertIds.current!.add(id));
        }
      } catch {
        // Polling errors shouldn't crash the notification badge.
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const setTheme = (t: Theme) => setThemeState(t);
  const setCurrentUser = (r: Role) => {
    setCurrentUserRole(r);
    api.setCurrentUser(r);
  };
  const clearNotifications = () => setUnread(0);

  return (
    <Ctx.Provider value={{ theme, setTheme, currentUser, setCurrentUser, unreadEscalations, clearNotifications }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
