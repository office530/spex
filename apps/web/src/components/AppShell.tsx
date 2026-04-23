import { Button } from '@spex/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm transition-colors ${
    isActive
      ? 'bg-muted font-medium'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
  }`;

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
          <div className="flex items-center gap-1 flex-1">
            <NavLink to="/" end className={navLinkClass}>
              {t('nav.dashboard')}
            </NavLink>
            {isAdmin && (
              <NavLink to="/users" className={navLinkClass}>
                {t('nav.users')}
              </NavLink>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-sm text-end hidden sm:block">
              <div className="font-medium leading-tight">{displayName}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </nav>
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
