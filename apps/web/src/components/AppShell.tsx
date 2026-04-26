import { Button } from '@spex/ui';
import {
  BarChart3,
  Building2,
  CalendarDays,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Receipt,
  Settings as SettingsIcon,
  Target,
  Truck,
  FolderKanban,
  UserRoundCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { useRoleGroup } from '../auth/useRoleGroup';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from './NotificationBell';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

interface NavItem {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  key: string;
}

const WORKSPACE: NavItem[] = [
  { to: '/', end: true, icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/projects', icon: FolderKanban, key: 'nav.projects' },
  { to: '/my-tasks', icon: ListChecks, key: 'nav.myTasks' },
  { to: '/leads', icon: Target, key: 'nav.leads' },
  { to: '/calendar', icon: CalendarDays, key: 'nav.calendar' },
  { to: '/tickets', icon: Inbox, key: 'nav.tickets' },
];

const DIRECTORY: NavItem[] = [
  { to: '/financials', icon: Receipt, key: 'nav.financials' },
  { to: '/reports', icon: BarChart3, key: 'nav.reports' },
  { to: '/activity', icon: History, key: 'nav.activity' },
  { to: '/clients', icon: Building2, key: 'nav.clients' },
  { to: '/suppliers', icon: Truck, key: 'nav.suppliers' },
  { to: '/consultants', icon: UserRoundCog, key: 'nav.consultants' },
  { to: '/users', icon: Users, key: 'nav.users' },
  { to: '/settings', icon: SettingsIcon, key: 'nav.settings' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-active font-medium'
      : 'text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
  }`;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { profile, user, signOut } = useAuth();
  const roleLabel = profile ? t(`roles.${profile.role}`) : t('roles.unknown');
  const displayName = profile?.full_name || user?.email || '';
  const initials = (displayName || '·')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;
  const roleGroup = useRoleGroup();
  // Foreman doesn't have CRM/Leads access per BLUEPRINT.md §7. Filter the
  // workspace nav so only items the foreman can act on appear.
  const workspaceItems =
    roleGroup === 'foreman'
      ? WORKSPACE.filter((item) => item.to !== '/leads')
      : WORKSPACE;

  return (
    <div className="min-h-screen flex bg-muted/40">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-md"
      >
        {t('nav.skipToContent')}
      </a>
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5">
          <div className="text-lg font-bold">{t('app.name')}</div>
          <div className="text-xs text-sidebar-muted-foreground mt-0.5">
            {t('app.tagline')}
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
          <NavSection label={t('nav.sections.workspace')} items={workspaceItems} />
          {isAdmin && (
            <NavSection label={t('nav.sections.directory')} items={DIRECTORY} />
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-accent/50">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-sidebar-muted-foreground truncate">{roleLabel}</div>
            </div>
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
              className="h-8 w-8 p-0 text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label={t('nav.logout')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar — Phase 75 polish: bigger touch targets (h-11 / 44px+),
         bell visible alongside nav, scrollable horizontal nav strip. */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 h-12 flex items-center justify-between bg-sidebar text-sidebar-foreground px-3 gap-2">
        <div className="font-bold shrink-0 text-base">{t('app.name')}</div>
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
          {[...workspaceItems, ...(isAdmin ? DIRECTORY : [])].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md min-w-[2.5rem] h-9 grid place-items-center transition-colors ${
                  isActive
                    ? 'text-sidebar-active bg-sidebar-accent'
                    : 'text-sidebar-muted-foreground hover:text-sidebar-foreground'
                }`
              }
              aria-label={t(item.key)}
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          ))}
        </div>
        <NotificationBell />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOut()}
          className="h-9 w-9 p-0 shrink-0 text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label={t('nav.logout')}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <main id="main-content" className="flex-1 min-w-0 pt-12 md:pt-0">
        {/* Phase 76: page-fade-in keyed on route swaps via React Router's
           remount-on-key pattern — handled implicitly because each page
           component remounts when the URL changes. */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 page-fade-in">
          {children}
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <div className="px-3 text-xs font-medium text-sidebar-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
          <item.icon />
          {t(item.key)}
        </NavLink>
      ))}
    </div>
  );
}
