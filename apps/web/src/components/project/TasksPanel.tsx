import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  StatusBadge,
} from '@spex/ui';
import { ListChecks } from 'lucide-react';
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
  parent_task_id: string | null;
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
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'awaiting_execution' as TaskStatus,
    priority: 'medium' as TaskPriority,
    assignee_id: '',
    due_date: '',
    parent_task_id: '',
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [tRes, uRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          'id, title, description, status, priority, assignee_id, due_date, sort_order, parent_task_id, assignee:user_profiles(full_name)',
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

  function startAdd(parentTaskId: string | null = null) {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      status: 'awaiting_execution',
      priority: 'medium',
      assignee_id: '',
      due_date: '',
      parent_task_id: parentTaskId ?? '',
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
      parent_task_id: r.parent_task_id ?? '',
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
      parent_task_id: form.parent_task_id || null,
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
            <Label htmlFor="task_parent">{t('tasks.parentTask')}</Label>
            <select
              id="task_parent"
              value={form.parent_task_id}
              onChange={(e) => setForm((f) => ({ ...f, parent_task_id: e.target.value }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('tasks.noParent')}</option>
              {rows
                .filter((r) => r.id !== editingId && r.parent_task_id == null)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
            </select>
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
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border text-xs">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-2 py-1 rounded-s-md ${view === 'list' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
            >
              {t('tasks.viewList')}
            </button>
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`px-2 py-1 rounded-e-md ${view === 'kanban' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
            >
              {t('tasks.viewKanban')}
            </button>
          </div>
          {canWrite && !adding && !editingId && (
            <Button size="sm" variant="outline" onClick={() => startAdd()}>
              {t('tasks.add')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : view === 'kanban' && !adding && !editingId ? (
          rows.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={t('tasks.empty')}
              cta={canWrite ? { label: t('tasks.add'), onClick: () => startAdd() } : undefined}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-4">
              {STATUSES.map((status) => {
                const bucket = rows.filter((r) => r.status === status);
                return (
                  <div
                    key={status}
                    className="bg-muted/30 rounded-lg p-2 space-y-2 min-h-[160px]"
                  >
                    <div className="flex items-center justify-between text-xs font-medium px-1">
                      <span>{t(`tasks.status.${status}`)}</span>
                      <span className="text-muted-foreground">{bucket.length}</span>
                    </div>
                    {bucket.map((r) => {
                      const isOverdue =
                        r.due_date &&
                        new Date(r.due_date).getTime() < Date.now() &&
                        r.status !== 'done' &&
                        r.status !== 'cancelled';
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => startEdit(r)}
                          className="w-full text-start bg-background rounded p-2 shadow-sm hover:shadow space-y-1 transition-shadow"
                        >
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          {r.assignee?.full_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {r.assignee.full_name}
                            </div>
                          )}
                          <div className="flex items-center gap-1 flex-wrap">
                            <StatusBadge
                              family="task_priority"
                              value={r.priority}
                              label={t(`tasks.priority.${r.priority}`)}
                            />
                            {r.due_date && (
                              <span
                                className={`text-xs ${
                                  isOverdue
                                    ? 'text-rose-700 font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {dateFormat.format(new Date(r.due_date))}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {bucket.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-2">—</div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="divide-y">
            {adding && renderForm()}
            {rows.length === 0 && !adding ? (
              <EmptyState
                icon={ListChecks}
                title={t('tasks.empty')}
                cta={canWrite ? { label: t('tasks.add'), onClick: () => startAdd() } : undefined}
              />
            ) : (
              (() => {
                const byParent = new Map<string, TaskRow[]>();
                rows.forEach((r) => {
                  if (r.parent_task_id) {
                    const arr = byParent.get(r.parent_task_id) ?? [];
                    arr.push(r);
                    byParent.set(r.parent_task_id, arr);
                  }
                });
                const topLevel = rows.filter((r) => !r.parent_task_id);
                const renderTaskRow = (r: TaskRow, depth = 0) =>
                  editingId === r.id ? (
                    <div key={r.id}>{renderForm()}</div>
                  ) : (
                    <div
                      key={r.id}
                      className="px-6 py-3 space-y-2"
                      style={depth > 0 ? { paddingInlineStart: `${24 + depth * 24}px` } : undefined}
                    >
                      <div className="flex items-start gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">
                            {depth > 0 && <span className="text-muted-foreground me-1">↳</span>}
                            {r.title}
                          </div>
                          {r.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-line mt-0.5">
                              {r.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
                            <span>{r.assignee?.full_name ?? t('tasks.noAssignee')}</span>
                            {r.due_date && (() => {
                              const isOverdue =
                                new Date(r.due_date).getTime() < Date.now() &&
                                r.status !== 'done' &&
                                r.status !== 'cancelled';
                              return (
                                <span className={isOverdue ? 'text-rose-700 font-medium' : ''}>
                                  · {dateFormat.format(new Date(r.due_date))}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 flex-wrap">
                          {r.due_date &&
                            new Date(r.due_date).getTime() < Date.now() &&
                            r.status !== 'done' &&
                            r.status !== 'cancelled' && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-800">
                                {t('tasks.overdue')}
                              </span>
                            )}
                          <StatusBadge
                            family="task_priority"
                            value={r.priority}
                            label={t(`tasks.priority.${r.priority}`)}
                          />
                          <StatusBadge
                            family="task"
                            value={r.status}
                            label={t(`tasks.status.${r.status}`)}
                          />
                        </div>
                        {canWrite && (
                          <div className="shrink-0 flex items-center gap-1">
                            {depth === 0 && (
                              <Button size="sm" variant="ghost" onClick={() => startAdd(r.id)}>
                                +
                              </Button>
                            )}
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
                      <TaskChecklist taskId={r.id} canWrite={canWrite} />
                      <TaskDependencies
                        taskId={r.id}
                        allTasks={rows}
                        canWrite={canWrite}
                      />
                    </div>
                  );
                return topLevel.flatMap((parent) => [
                  renderTaskRow(parent, 0),
                  ...(byParent.get(parent.id) ?? []).map((child) => renderTaskRow(child, 1)),
                ]);
              })()
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChecklistItemRow {
  id: string;
  text: string;
  is_done: boolean;
  sort_order: number;
}

function TaskChecklist({ taskId, canWrite }: { taskId: string; canWrite: boolean }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error: dbErr } = await supabase
      .from('checklist_items')
      .select('id, text, is_done, sort_order')
      .eq('task_id', taskId)
      .order('sort_order');
    if (dbErr) setError(dbErr.message);
    else setItems((data as ChecklistItemRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function toggle(item: ChecklistItemRow) {
    const previous = items;
    setItems(items.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i)));
    const { error: dbErr } = await supabase
      .from('checklist_items')
      .update({ is_done: !item.is_done })
      .eq('id', item.id);
    if (dbErr) {
      setError(dbErr.message);
      setItems(previous);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setSaving(true);
    setError(null);
    const nextOrder = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { error: dbErr } = await supabase.from('checklist_items').insert({
      task_id: taskId,
      text: newText.trim(),
      sort_order: nextOrder,
    });
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    setNewText('');
    await refresh();
  }

  async function remove(item: ChecklistItemRow) {
    if (!confirm(t('tasks.confirmDeleteChecklistItem'))) return;
    const { error: dbErr } = await supabase.from('checklist_items').delete().eq('id', item.id);
    if (dbErr) setError(dbErr.message);
    else await refresh();
  }

  const done = items.filter((i) => i.is_done).length;
  const total = items.length;

  if (loading) return null;
  // When there are no items AND user can't add, don't clutter the row.
  if (total === 0 && !canWrite) return null;

  return (
    <div className="ms-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{t('tasks.checklist')}</span>
        {total > 0 && <span>({t('tasks.checklistProgress', { done, total })})</span>}
      </button>
      {expanded && (
        <div className="mt-2 rounded-md border bg-muted/30 p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('tasks.checklistEmpty')}</p>
          ) : (
            <div className="space-y-1">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-2 bg-background rounded px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={i.is_done}
                    disabled={!canWrite}
                    onChange={() => void toggle(i)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span
                    className={`flex-1 text-sm ${i.is_done ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {i.text}
                  </span>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-auto px-2 py-0.5"
                      onClick={() => void remove(i)}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canWrite && (
            <form onSubmit={addItem} className="flex items-center gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder={t('tasks.addChecklistItem')}
                disabled={saving}
                className="h-8 flex-1"
              />
              <Button type="submit" size="sm" disabled={saving || !newText.trim()}>
                {t('common.add')}
              </Button>
            </form>
          )}
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface DependencyRow {
  id: string;
  depends_on_task_id: string;
}

function TaskDependencies({
  taskId,
  allTasks,
  canWrite,
}: {
  taskId: string;
  allTasks: TaskRow[];
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const [deps, setDeps] = useState<DependencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newDepId, setNewDepId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error: dbErr } = await supabase
      .from('task_dependencies')
      .select('id, depends_on_task_id')
      .eq('task_id', taskId);
    if (dbErr) setError(dbErr.message);
    else setDeps((data as DependencyRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const existingIds = new Set(deps.map((d) => d.depends_on_task_id));
  const selectable = allTasks.filter((tk) => tk.id !== taskId && !existingIds.has(tk.id));

  async function addDep(e: React.FormEvent) {
    e.preventDefault();
    if (!newDepId) return;
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase.from('task_dependencies').insert({
      task_id: taskId,
      depends_on_task_id: newDepId,
    });
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setNewDepId('');
    setAdding(false);
    await refresh();
  }

  async function removeDep(d: DependencyRow) {
    if (!confirm(t('tasks.confirmDeleteDependency'))) return;
    const { error: dbErr } = await supabase.from('task_dependencies').delete().eq('id', d.id);
    if (dbErr) setError(dbErr.message);
    else await refresh();
  }

  if (loading) return null;
  if (deps.length === 0 && !canWrite) return null;

  const notDone = deps.filter((d) => {
    const t2 = allTasks.find((x) => x.id === d.depends_on_task_id);
    return t2 && t2.status !== 'done' && t2.status !== 'cancelled';
  }).length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{t('tasks.dependencies')}</span>
        {deps.length > 0 && <span>({deps.length})</span>}
        {notDone > 0 && (
          <span className="text-amber-700 font-medium">· {t('tasks.waitingPrereqs')}</span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 rounded-md border bg-muted/30 p-3 space-y-2">
          {deps.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('tasks.emptyDependencies')}</p>
          ) : (
            <div className="space-y-1">
              {deps.map((d) => {
                const t2 = allTasks.find((x) => x.id === d.depends_on_task_id);
                if (!t2) return null;
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 text-sm bg-background rounded px-3 py-1.5"
                  >
                    <div className="flex-1 min-w-0 truncate">{t2.title}</div>
                    <StatusBadge
                      family="task"
                      value={t2.status}
                      label={t(`tasks.status.${t2.status}`)}
                      className="shrink-0"
                    />
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive h-auto px-2 py-0.5"
                        onClick={() => void removeDep(d)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {canWrite && selectable.length > 0 && (
            adding ? (
              <form onSubmit={addDep} className="flex items-center gap-2">
                <select
                  value={newDepId}
                  onChange={(e) => setNewDepId(e.target.value)}
                  required
                  disabled={saving}
                  className="flex h-8 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">{t('tasks.selectDependency')}</option>
                  {selectable.map((tk) => (
                    <option key={tk.id} value={tk.id}>{tk.title}</option>
                  ))}
                </select>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={saving || !newDepId}>
                  {t('common.add')}
                </Button>
              </form>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                {t('tasks.addDependency')}
              </Button>
            )
          )}
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
