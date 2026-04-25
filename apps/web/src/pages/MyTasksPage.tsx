import {
  Card,
  CardContent,
  EmptyState,
  Input,
  PageHeader,
  SkeletonRows,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@spex/ui';
import { CalendarDays, ListChecks, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isTaskOverdue } from '../lib/taskHelpers';
import { supabase } from '../lib/supabase';

type TaskStatus =
  | 'awaiting_execution'
  | 'in_progress'
  | 'done'
  | 'awaiting_manager_approval'
  | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type StatusFilter = 'open' | 'all' | TaskStatus;

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  project: { name: string } | null;
}

const CLOSED_STATUSES: TaskStatus[] = ['done', 'cancelled'];

export function MyTasksPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const search = params.get('q') ?? '';
  const statusFilter = (params.get('status') ?? 'open') as StatusFilter;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const myId = user?.id ?? '00000000-0000-0000-0000-000000000000';
      let query = supabase
        .from('tasks')
        .select(
          'id, title, status, priority, due_date, project_id, project:projects(name)',
        )
        .eq('assignee_id', myId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (statusFilter === 'open') {
        query = query.not('status', 'in', `(${CLOSED_STATUSES.join(',')})`);
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        if (import.meta.env.DEV) console.error('[my-tasks] load failed', error);
      }
      setTasks((data as unknown as Task[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const needle = search.trim().toLowerCase();
    return tasks.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        (r.project?.name ?? '').toLowerCase().includes(needle),
    );
  }, [tasks, search]);

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function setFilter(next: Partial<{ q: string; status: StatusFilter }>) {
    const np = new URLSearchParams(params);
    if (next.q !== undefined) {
      if (next.q) np.set('q', next.q);
      else np.delete('q');
    }
    if (next.status !== undefined) {
      if (next.status === 'open') np.delete('status');
      else np.set('status', next.status);
    }
    setParams(np, { replace: true });
  }

  const statusOptions: Array<{ value: StatusFilter; key: string }> = [
    { value: 'open', key: 'myTasks.filterOpen' },
    { value: 'in_progress', key: 'tasks.status.in_progress' },
    { value: 'awaiting_manager_approval', key: 'tasks.status.awaiting_manager_approval' },
    { value: 'done', key: 'tasks.status.done' },
    { value: 'all', key: 'myTasks.filterAll' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('myTasks.title')}
        subtitle={t('myTasks.subtitle')}
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[16rem]">
              <Search className="h-4 w-4 absolute top-2.5 start-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setFilter({ q: e.target.value })}
                placeholder={t('myTasks.searchPlaceholder')}
                className="ps-8"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-md bg-muted">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter({ status: opt.value })}
                  className={`text-xs font-medium px-3 py-1 rounded transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(opt.key)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <SkeletonRows count={8} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={t('myTasks.empty')}
              description={search ? t('myTasks.emptySearch') : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('myTasks.col.title')}</TableHead>
                  <TableHead>{t('myTasks.col.project')}</TableHead>
                  <TableHead>{t('myTasks.col.priority')}</TableHead>
                  <TableHead>{t('myTasks.col.status')}</TableHead>
                  <TableHead>{t('myTasks.col.due')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => {
                  const overdue = isTaskOverdue(task);
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Link
                          to={task.project_id ? `/projects/${task.project_id}` : '/projects'}
                          className="font-medium hover:underline"
                        >
                          {task.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {task.project?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          family="task_priority"
                          value={task.priority}
                          label={t(`tasks.priority.${task.priority}`)}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          family="task"
                          value={task.status}
                          label={t(`tasks.status.${task.status}`)}
                        />
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <span
                            className={`inline-flex items-center gap-1 text-sm ${overdue ? 'text-destructive font-medium' : ''}`}
                          >
                            <CalendarDays className="h-3 w-3" />
                            {dateFmt.format(new Date(task.due_date))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
