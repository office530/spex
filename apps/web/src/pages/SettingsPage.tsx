import { Card, CardContent, PageHeader } from '@spex/ui';
import { Bell, Milestone, Zap, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface SettingsTile {
  to: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
}

const TILES: SettingsTile[] = [
  {
    to: '/settings/milestones',
    icon: Milestone,
    titleKey: 'settings.hub.milestones.title',
    descriptionKey: 'settings.hub.milestones.description',
  },
  {
    to: '/settings/automations',
    icon: Zap,
    titleKey: 'settings.hub.automations.title',
    descriptionKey: 'settings.hub.automations.description',
  },
  {
    to: '/settings/notifications',
    icon: Bell,
    titleKey: 'settings.hub.notifications.title',
    descriptionKey: 'settings.hub.notifications.description',
  },
];

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.hub.title')} subtitle={t('settings.hub.subtitle')} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className="block group">
            <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                  <tile.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{t(tile.titleKey)}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {t(tile.descriptionKey)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
