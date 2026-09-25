import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardPlus, Bell, BookOpen, ScrollText, Settings, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/i18n';

const navItems = [
  { to: '/', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/log-defect', icon: ClipboardPlus, key: 'nav.logDefect' },
  { to: '/alerts', icon: Bell, key: 'nav.alerts' },
  { to: '/knowledge-base', icon: BookOpen, key: 'nav.knowledgeBase' },
  { to: '/audit', icon: ScrollText, key: 'nav.auditTrail' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
];

export function Sidebar() {
  const { t } = useI18n();
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-steel-800 bg-steel-900">
      <div className="flex items-center gap-2.5 border-b border-steel-800 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brass-600">
          <ShieldAlert className="h-5 w-5 text-steel-50" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight tracking-tight text-steel-50">{t('app.title')}</h1>
          <p className="text-xs font-medium text-steel-400">{t('app.subtitle')}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brass-500 ${
                  isActive
                    ? 'bg-steel-800 text-steel-50'
                    : 'text-steel-400 hover:bg-steel-800/60 hover:text-steel-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brass-500" aria-hidden />}
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-brass-400' : ''}`} aria-hidden />
                  {t(item.key)}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-steel-800 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-steel-500">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          System Online
        </div>
      </div>
    </aside>
  );
}
