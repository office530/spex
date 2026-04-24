import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@spex/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

interface KpiData {
  activeProjects: number;
  activeLeads: number;
  openTasks: number;
  openRfis: number;
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
      const [projRes, leadRes, taskRes, rfiRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', `(${CLOSED_LEAD_STATUSES.join(',')})`),
        user
          ? supabase
              .from('tasks')
              .select('id', { count: 'exact', head: true })
              .eq('assignee_id', user.id)
              .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`)
          : Promise.resolve({ count: 0, error: null }),
        supabase.from('rfis').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      if (cancelled) return;
      setKpis({
        activeProjects: projRes.count ?? 0,
        activeLeads: leadRes.count ?? 0,
        openTasks: taskRes.count ?? 0,
        openRfis: rfiRes.count ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tiles = [
    { label: t('dashboard.activeProjects'), value: kpis?.activeProjects, to: '/projects' },
    { label: t('dashboard.activeLeads'), value: kpis?.activeLeads, to: '/leads' },
    { label: t('dashboard.openTasks'), value: kpis?.openTasks, to: '/projects' },
    { label: t('dashboard.openRfis'), value: kpis?.openRfis, to: '/projects' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Link key={tile.label} to={tile.to} className="block">
            <Card className="hover:bg-muted/60 transition-colors h-full">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{tile.label}</div>
                <div className="text-2xl font-semibold mt-1">
                  {tile.value ?? '—'}
                </div>
              </CardContent>
            </Card>
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
