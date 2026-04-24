import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@spex/ui';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.welcome')}</CardTitle>
          <CardDescription>{t('dashboard.scaffoldNotice')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Phase 0 step 6 — role-gated nav shell + user profile CRUD.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
