import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatCurrencyILS,
  KpiDelta,
  KpiTile,
  StatusBadge,
  type IconTone,
} from '@spex/ui';
import {
  CalendarDays,
  FolderKanban,
  HelpCircle,
  Inbox,
  ListChecks,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
type TaskStatus =
  | 'awaiting_execution'
  | 'in_progress'
  | 'done'
  | 'awaiting_manager_approval'
  | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Counts {
  total: number;
  newThisWeek: number;
}

interface KpiData {
  activeProjects: Counts;
  activeLeads: Counts;
  openTasks: Counts;
  openRfis: Counts;
}

interface RecentProject {
  id: string;
  name: string;
  status: ProjectStatus;
  contract_value: number | null;
  client: { company_name: string } | null;
  pm: { full_name: string } | null;
}

interface UpcomingTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  project: { name: string } | null;
}

const CLOSED_LEAD_STATUSES = ['won', 'lost', 'not_relevant'];
const CLOSED_TASK_STATUSES = ['done', 'cancelled'];

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const myId = user?.id ?? '00000000-0000-0000-0000-000000000000';

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
          .eq('assignee_id', myId)
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
        recentRes,
        upcomingRes,
      ] = await Promise.all([
        projectsQ(),
        projectsQ().gte('created_at', weekAgo),
        leadsQ(),
        leadsQ().gte('created_at', weekAgo),
        tasksQ(),
        tasksQ().gte('created_at', weekAgo),
        rfisQ(),
        rfisQ().gte('created_at', weekAgo),
        supabase
          .from('projects')
          .select(
            'id, name, status, contract_value, client:clients(company_name), pm:user_profiles!projects_pm_id_fkey(full_name)',
          )
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('tasks')
          .select(
            'id, title, status, priority, due_date, project_id, project:projects(name)',
          )
          .eq('assignee_id', myId)
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(5),
      ]);
      if (cancelled) return;
      setKpis({
        activeProjects: { total: projRes.count ?? 0, newThisWeek: projWeek.count ?? 0 },
        activeLeads: { total: leadRes.count ?? 0, newThisWeek: leadWeek.count ?? 0 },
        openTasks: { total: taskRes.count ?? 0, newThisWeek: taskWeek.count ?? 0 },
        openRfis: { total: rfiRes.count ?? 0, newThisWeek: rfiWeek.count ?? 0 },
      });
      setRecentProjects((recentRes.data as unknown as RecentProject[]) ?? []);
      setUpcomingTasks((upcomingRes.data as unknown as UpcomingTask[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tiles: Array<{
    label: string;
    icon: LucideIcon;
    iconTone: IconTone;
    data: Counts | undefined;
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

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            to={tile.to}
            className="block transition-transform hover:-translate-y-0.5"
          >
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

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Recent projects */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t('dashboard.recentProjects')}</CardTitle>
            <Link to="/projects" className="text-xs text-primary font-medium hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentProjects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title={t('dashboard.noRecentProjects')}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 p-4">
                {recentProjects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="rounded-lg border bg-background hover:border-primary/50 hover:shadow-sm p-4 space-y-2 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.client?.company_name ?? '—'}
                        </div>
                      </div>
                      <StatusBadge
                        family="project"
                        value={p.status}
                        label={t(`projects.status.${p.status}`)}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground truncate">
                        {p.pm?.full_name ?? t('projects.noPm')}
                      </div>
                      {p.contract_value != null && (
                        <div className="text-sm font-medium shrink-0">
                          {formatCurrencyILS(p.contract_value)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My upcoming tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.myUpcomingTasks')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingTasks.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t('dashboard.noUpcomingTasks')}
              />
            ) : (
              <div className="divide-y">
                {upcomingTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={task.project_id ? `/projects/${task.project_id}` : '/projects'}
                    className="block px-4 py-3 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{task.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {task.project?.name ?? '—'}
                        </div>
                      </div>
                      <StatusBadge
                        family="task_priority"
                        value={task.priority}
                        label={t(`tasks.priority.${task.priority}`)}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span>
                        {task.due_date
                          ? dateFmt.format(new Date(task.due_date))
                          : t('dashboard.noDueDate')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
