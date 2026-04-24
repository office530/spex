import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@spex/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { toDatetimeInput, fromDatetimeInput } from './format';

type TaskStatus =
  | 'awaiting_execution'
  | 'in_progress'
  | 'done'
  | 'awaiting_manager_approval'
  | 'cancelled';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const STATUSES: TaskStatus[] = [
  'awaiting_execution',
  'in_progress',
  'done',
  'awaiting_manager_approval',
  'cancelled',
];

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const STATUS_COLORS: Record<TaskStatus, string> = {
  awaiting_execution: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-emerald-100 text-emerald-800',
  awaiting_manager_approval: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-slate-100 text-slate-600',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-rose-100 text-rose-800',
};

interface UserOption {
  id: string;
  full_name: string;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  sort_order: number;
  assignee: { full_name: string } | null;
}

export function TasksPanel({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'awaiting_execution' as TaskStatus,
    priority: 'medium' as TaskPriority,
    assignee_id: '',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [tRes, uRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          'id, title, description, status, priority, assignee_id, due_date, sort_order, assignee:user_profiles(full_name)',
        )
        .eq('project_id', projectId)
        .order('sort_order'),
      canWrite && users.length === 0
        ? supabase
            .from('user_profiles')
            .select('id, full_name')
            .eq('is_active', true)
            .order('full_name')
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (tRes.error) setError(tRes.error.message);
    else setRows((tRes.data as unknown as TaskRow[]) ?? []);
    if (uRes.data) setUsers(uRes.data as UserOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      status: 'awaiting_execution',
      priority: 'medium',
      assignee_id: '',
      due_date: '',
    });
    setError(null);
    setAdding(true);
  }

  function startEdit(r: TaskRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      title: r.title,
      description: r.description ?? '',
      status: r.status,
      priority: r.priority,
      assignee_id: r.assignee_id ?? '',
      due_date: toDatetimeInput(r.due_date),
    });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || null,
      due_date: fromDatetimeInput(form.due_date),
    };
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    const { error } = adding
      ? await supabase
          .from('tasks')
          .insert({ ...payload, project_id: projectId, sort_order: nextOrder })
      : await supabase.from('tasks').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancel();
    await refresh();
  }

  async function remove(r: TaskRow) {
    if (!confirm(t('tasks.confirmDelete'))) return;
    const { error } = await supabase.from('tasks').delete().eq('id', r.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="task_title">{t('tasks.titleLabel')} *</Label>
            <Input
              id="task_title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="task_status">{t('tasks.statusLabel')}</Label>
            <select
              id="task_status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`tasks.status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="task_priority">{t('tasks.priorityLabel')}</Label>
            <select
              id="task_priority"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="task_assignee">{t('tasks.assignee')}</Label>
            <select
              id="task_assignee"
              value={form.assignee_id}
              onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('tasks.noAssignee')}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="task_due">{t('tasks.dueDate')}</Label>
            <Input
              id="task_due"
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="task_desc">{t('tasks.description')}</Label>
            <textarea
              id="task_desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t('tasks.title')}</CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('tasks.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : (
          <div className="divide-y">
            {adding && renderForm()}
            {rows.length === 0 && !adding ? (
              <p className="text-sm text-muted-foreground p-6">{t('tasks.empty')}</p>
            ) : (
              rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <div key={r.id} className="px-6 py-3 space-y-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{r.title}</div>
                        {r.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line mt-0.5">
                            {r.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
                          <span>{r.assignee?.full_name ?? t('tasks.noAssignee')}</span>
                          {r.due_date && (
                            <span>· {dateFormat.format(new Date(r.due_date))}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[r.priority]}`}
                        >
                          {t(`tasks.priority.${r.priority}`)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}
                        >
                          {t(`tasks.status.${r.status}`)}
                        </span>
                      </div>
                      {canWrite && (
                        <div className="shrink-0 flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                            {t('common.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void remove(r)}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
