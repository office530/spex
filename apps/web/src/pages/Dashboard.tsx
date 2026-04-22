import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@spex/ui';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="container mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">{t('app.name')}</h1>
          <p className="text-muted-foreground">{t('app.tagline')}</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.welcome')}</CardTitle>
            <CardDescription>{t('dashboard.scaffoldNotice')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Phase 0 step 5 — Vite shell, Tailwind RTL, i18next, shadcn primitives.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
