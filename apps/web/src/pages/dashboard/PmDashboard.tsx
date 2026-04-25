import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatCurrencyILS,
  KpiDelta,
  KpiTile,
  ProgressRing,
  SkeletonRows,
  StatusBadge,
  type IconTone,
} from '@spex/ui';
import {
  CalendarDays,
  FolderKanban,
  HelpCircle,
  Inbox,
  ListChecks,
  Milestone,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
type TaskStatus =
  | 'awaiting_execution'
  | 'in_progress'
  | 'done'
  | 'awaiting_manager_approval'
  | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const CLOSED_TASK_STATUSES = ['done', 'cancelled'];

interface Counts {
  total: number;
  newThisWeek: number;
}

interface KpiData {
  myProjects: Counts;
  myTasks: Counts;
  upcomingMilestones: Counts;
  myRfis: Counts;
}

interface MyProject {
  id: string;
  name: string;
  status: ProjectStatus;
  contract_value: number | null;
  client: { company_name: string } | null;
  milestones: Array<{ execution_status: string }> | null;
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

export function PmDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const myId = user?.id ?? '00000000-0000-0000-0000-000000000000';
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fortnight = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [
        projAll,
        projWeek,
        taskAll,
        taskWeek,
        msAll,
        msWeek,
        rfiAll,
        rfiWeek,
        myProjRes,
        upcomingRes,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('pm_id', myId)
          .eq('status', 'active'),
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('pm_id', myId)
          .eq('status', 'active')
          .gte('created_at', weekAgo),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', myId)
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', myId)
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`)
          .gte('created_at', weekAgo),
        supabase
          .from('milestones')
          .select('id', { count: 'exact', head: true })
          .lte('target_date', fortnight)
          .neq('execution_status', 'done'),
        supabase
          .from('milestones')
          .select('id', { count: 'exact', head: true })
          .lte('target_date', fortnight)
          .neq('execution_status', 'done')
          .gte('created_at', weekAgo),
        supabase
          .from('rfis')
          .select('id', { count: 'exact', head: true })
          .eq('opener_id', myId)
          .eq('status', 'open'),
        supabase
          .from('rfis')
          .select('id', { count: 'exact', head: true })
          .eq('opener_id', myId)
          .eq('status', 'open')
          .gte('created_at', weekAgo),
        supabase
          .from('projects')
          .select(
            'id, name, status, contract_value, client:clients(company_name), milestones(execution_status)',
          )
          .eq('pm_id', myId)
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
        myProjects: { total: projAll.count ?? 0, newThisWeek: projWeek.count ?? 0 },
        myTasks: { total: taskAll.count ?? 0, newThisWeek: taskWeek.count ?? 0 },
        upcomingMilestones: { total: msAll.count ?? 0, newThisWeek: msWeek.count ?? 0 },
        myRfis: { total: rfiAll.count ?? 0, newThisWeek: rfiWeek.count ?? 0 },
      });
      setMyProjects((myProjRes.data as unknown as MyProject[]) ?? []);
      setUpcoming((upcomingRes.data as unknown as UpcomingTask[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  const tiles: Array<{
    label: string;
    icon: LucideIcon;
    iconTone: IconTone;
    data: Counts | undefined;
    to: string;
  }> = [
    {
      label: t('dashboard.myProjects'),
      icon: FolderKanban,
      iconTone: 'info',
      data: kpis?.myProjects,
      to: '/projects',
    },
    {
      label: t('dashboard.myTasks'),
      icon: ListChecks,
      iconTone: 'success',
      data: kpis?.myTasks,
      to: '/my-tasks',
    },
    {
      label: t('dashboard.upcomingMilestones'),
      icon: Milestone,
      iconTone: 'warning',
      data: kpis?.upcomingMilestones,
      to: '/projects',
    },
    {
      label: t('dashboard.myRfis'),
      icon: HelpCircle,
      iconTone: 'accent',
      data: kpis?.myRfis,
      to: '/projects',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.titlePm')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.subtitlePm')}</p>
      </div>

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
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t('dashboard.myProjects')}</CardTitle>
            <Link to="/projects" className="text-xs text-primary font-medium hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {kpis === null ? (
              <SkeletonRows count={4} />
            ) : myProjects.length === 0 ? (
              <EmptyState icon={FolderKanban} title={t('dashboard.noMyProjects')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 p-4">
                {myProjects.map((p) => {
                  const total = p.milestones?.length ?? 0;
                  const done = p.milestones?.filter((m) => m.execution_status === 'done').length ?? 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="rounded-lg border bg-background hover:border-primary/50 hover:shadow-sm p-4 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p.client?.company_name ?? '—'}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge
                              family="project"
                              value={p.status}
                              label={t(`projects.status.${p.status}`)}
                            />
                            {p.contract_value != null && (
                              <span className="text-xs font-medium">
                                {formatCurrencyILS(p.contract_value)}
                              </span>
                            )}
                          </div>
                        </div>
                        {total > 0 && (
                          <ProgressRing value={pct} size={48} strokeWidth={4}>
                            <span className="text-[10px] font-semibold tabular-nums">
                              {done}/{total}
                            </span>
                          </ProgressRing>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t('dashboard.myUpcomingTasks')}</CardTitle>
            <Link to="/my-tasks" className="text-xs text-primary font-medium hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {kpis === null ? (
              <SkeletonRows count={4} />
            ) : upcoming.length === 0 ? (
              <EmptyState icon={Inbox} title={t('dashboard.noUpcomingTasks')} />
            ) : (
              <div className="divide-y">
                {upcoming.map((task) => (
                  <Link
                    key={task.id}
                    to={task.project_id ? `/projects/${task.project_id}` : '/my-tasks'}
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
