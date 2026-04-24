import { Card, CardDescription, CardHeader, CardTitle, KpiDelta, KpiTile } from '@spex/ui';
import {
  FolderKanban,
  HelpCircle,
  ListChecks,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { IconTone } from '@spex/ui';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

interface KpiData {
  activeProjects: { total: number; newThisWeek: number };
  activeLeads: { total: number; newThisWeek: number };
  openTasks: { total: number; newThisWeek: number };
  openRfis: { total: number; newThisWeek: number };
}

const CLOSED_LEAD_STATUSES = ['won', 'lost', 'not_relevant'];
const CLOSED_TASK_STATUSES = ['done', 'cancelled'];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KpiData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const projectsQ = () =>
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active');
      const leadsQ = () =>
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', `(${CLOSED_LEAD_STATUSES.join(',')})`);
      const tasksQ = () =>
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`);
      const rfisQ = () =>
        supabase.from('rfis').select('id', { count: 'exact', head: true }).eq('status', 'open');

      const [
        projRes,
        projWeek,
        leadRes,
        leadWeek,
        taskRes,
        taskWeek,
        rfiRes,
        rfiWeek,
      ] = await Promise.all([
        projectsQ(),
        projectsQ().gte('created_at', weekAgo),
        leadsQ(),
        leadsQ().gte('created_at', weekAgo),
        tasksQ(),
        tasksQ().gte('created_at', weekAgo),
        rfisQ(),
        rfisQ().gte('created_at', weekAgo),
      ]);
      if (cancelled) return;
      setKpis({
        activeProjects: { total: projRes.count ?? 0, newThisWeek: projWeek.count ?? 0 },
        activeLeads: { total: leadRes.count ?? 0, newThisWeek: leadWeek.count ?? 0 },
        openTasks: { total: taskRes.count ?? 0, newThisWeek: taskWeek.count ?? 0 },
        openRfis: { total: rfiRes.count ?? 0, newThisWeek: rfiWeek.count ?? 0 },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tiles: Array<{
    label: string;
    icon: LucideIcon;
    iconTone: IconTone;
    data: KpiData[keyof KpiData] | undefined;
    to: string;
  }> = [
    {
      label: t('dashboard.activeProjects'),
      icon: FolderKanban,
      iconTone: 'info',
      data: kpis?.activeProjects,
      to: '/projects',
    },
    {
      label: t('dashboard.activeLeads'),
      icon: Target,
      iconTone: 'accent',
      data: kpis?.activeLeads,
      to: '/leads',
    },
    {
      label: t('dashboard.openTasks'),
      icon: ListChecks,
      iconTone: 'success',
      data: kpis?.openTasks,
      to: '/projects',
    },
    {
      label: t('dashboard.openRfis'),
      icon: HelpCircle,
      iconTone: 'warning',
      data: kpis?.openRfis,
      to: '/projects',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Link key={tile.label} to={tile.to} className="block transition-transform hover:-translate-y-0.5">
            <KpiTile
              icon={tile.icon}
              iconTone={tile.iconTone}
              label={tile.label}
              value={tile.data?.total}
              footer={
                tile.data ? (
                  <KpiDelta delta={tile.data.newThisWeek} suffix={t('dashboard.thisWeek')} />
                ) : undefined
              }
            />
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.welcome')}</CardTitle>
          <CardDescription>{t('dashboard.scaffoldNotice')}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
