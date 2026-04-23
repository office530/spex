import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@spex/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();

  const roleLabel = profile ? t(`roles.${profile.role}`) : t('roles.unknown');
  const displayName = profile?.full_name ?? user?.email ?? '';

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="container mx-auto max-w-4xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('app.name')}</h1>
            <p className="text-muted-foreground">{t('app.tagline')}</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="text-right">
              <div className="font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              {t('nav.logout')}
            </Button>
          </div>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.welcome')}</CardTitle>
            <CardDescription>{t('dashboard.scaffoldNotice')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Phase 0 step 4b — auth context + protected routes + session-aware shell.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
