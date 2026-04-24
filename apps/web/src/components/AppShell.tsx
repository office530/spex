import { Button } from '@spex/ui';
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Target,
  Truck,
  FolderKanban,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
    isActive
      ? 'bg-muted font-medium text-foreground'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
  }`;

interface NavItem {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  key: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/projects', icon: FolderKanban, key: 'nav.projects' },
  { to: '/leads', icon: Target, key: 'nav.leads' },
  { to: '/clients', icon: Building2, key: 'nav.clients', adminOnly: true },
  { to: '/suppliers', icon: Truck, key: 'nav.suppliers', adminOnly: true },
  { to: '/users', icon: Users, key: 'nav.users', adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { profile, user, signOut } = useAuth();
  const roleLabel = profile ? t(`roles.${profile.role}`) : t('roles.unknown');
  const displayName = profile?.full_name || user?.email || '';
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <nav className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl flex items-center h-14 px-4 gap-4">
          <NavLink to="/" className="text-lg font-bold shrink-0">
            {t('app.name')}
          </NavLink>
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                <item.icon />
                {t(item.key)}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-sm text-end hidden sm:block">
              <div className="font-medium leading-tight">{displayName}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4 me-1.5" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </nav>
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
