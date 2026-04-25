import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  KpiTile,
  SkeletonRows,
  StatusBadge,
  type IconTone,
} from '@spex/ui';
import {
  CalendarDays,
  ClipboardList,
  HardHat,
  HelpCircle,
  Inbox,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';

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
}

interface KpiData {
  todayTasks: Counts;
  myOpenTasks: Counts;
  thisWeekTasks: Counts;
  myRfis: Counts;
}

interface FlatTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  project: { name: string } | null;
}

export function ForemanDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [tasks, setTasks] = useState<FlatTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const myId = user?.id ?? '00000000-0000-0000-0000-000000000000';
      const today = new Date().toISOString().slice(0, 10);
      const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [todayRes, openAllRes, weekRes, rfiRes, taskRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', myId)
          .eq('due_date', today)
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', myId)
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', myId)
          .lte('due_date', weekAhead)
          .gte('due_date', today)
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`),
        supabase
          .from('rfis')
          .select('id', { count: 'exact', head: true })
          .eq('opener_id', myId)
          .eq('status', 'open'),
        supabase
          .from('tasks')
          .select(
            'id, title, status, priority, due_date, project_id, project:projects(name)',
          )
          .eq('assignee_id', myId)
          .not('status', 'in', `(${CLOSED_TASK_STATUSES.join(',')})`)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(10),
      ]);

      if (cancelled) return;

      setKpis({
        todayTasks: { total: todayRes.count ?? 0 },
        myOpenTasks: { total: openAllRes.count ?? 0 },
        thisWeekTasks: { total: weekRes.count ?? 0 },
        myRfis: { total: rfiRes.count ?? 0 },
      });
      setTasks((taskRes.data as unknown as FlatTask[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });
  const todayIso = new Date().toISOString().slice(0, 10);

  const tiles: Array<{
    label: string;
    icon: LucideIcon;
    iconTone: IconTone;
    value: number | undefined;
    to: string;
  }> = [
    {
      label: t('dashboard.todayTasks'),
      icon: ClipboardList,
      iconTone: 'warning',
      value: kpis?.todayTasks.total,
      to: '/my-tasks',
    },
    {
      label: t('dashboard.myOpenTasks'),
      icon: ListChecks,
      iconTone: 'info',
      value: kpis?.myOpenTasks.total,
      to: '/my-tasks',
    },
    {
      label: t('dashboard.thisWeekTasks'),
      icon: CalendarDays,
      iconTone: 'success',
      value: kpis?.thisWeekTasks.total,
      to: '/my-tasks',
    },
    {
      label: t('dashboard.myRfis'),
      icon: HelpCircle,
      iconTone: 'accent',
      value: kpis?.myRfis.total,
      to: '/projects',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.titleForeman')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.subtitleForeman')}</p>
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
              value={tile.value}
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t('dashboard.myUpcomingTasks')}</CardTitle>
            <Link to="/my-tasks" className="text-xs text-primary font-medium hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {kpis === null ? (
              <SkeletonRows count={6} />
            ) : tasks.length === 0 ? (
              <EmptyState icon={Inbox} title={t('dashboard.noUpcomingTasks')} />
            ) : (
              <div className="divide-y">
                {tasks.map((task) => {
                  const isToday = task.due_date === todayIso;
                  return (
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
                      <div className={`flex items-center gap-2 mt-1 text-xs ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        <CalendarDays className="h-3 w-3" />
                        <span>
                          {task.due_date
                            ? isToday
                              ? t('dashboard.today')
                              : dateFmt.format(new Date(task.due_date))
                            : t('dashboard.noDueDate')}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardHat className="h-4 w-4" />
              {t('dashboard.workLogShortcutTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.workLogShortcutDescription')}
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              {t('dashboard.workLogShortcutComingSoon')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
