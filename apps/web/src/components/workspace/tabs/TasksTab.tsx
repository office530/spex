import {
  Button,
  EmptyState,
  Input,
  Label,
  SegmentedControl,
  type SegmentedControlOption,
  SkeletonRows,
  StatusBadge,
} from '@spex/ui';
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../../auth/AuthContext';
import { supabase } from '../../../lib/supabase';

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

interface UserOption {
  id: string;
  full_name: string;
}

interface TasksTabProps {
  lineId: string;
  projectId: string;
  canCrud: boolean;
  canEditOwn: boolean;
}

interface DraftState {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string;
  due_date: string;
}

const EMPTY_DRAFT: DraftState = {
  title: '',
  description: '',
  status: 'awaiting_execution',
  priority: 'medium',
  assignee_id: '',
  due_date: '',
};

function toDatetimeInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50';

export function TasksTab({ lineId, projectId, canCrud, canEditOwn }: TasksTabProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<TaskRow[] | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, title, description, status, priority, assignee_id, due_date, sort_order, assignee:user_profiles!assignee_id(full_name)',
      )
      .eq('boq_line_item_id', lineId)
      .order('sort_order', { ascending: true });
    if (error) {
      if (import.meta.env.DEV) console.error('[tasks-tab] load failed', error);
      setRows([]);
      return;
    }
    setRows((data as unknown as TaskRow[]) ?? []);
  }, [lineId]);

  const loadUsers = useCallback(async () => {
    if (!canCrud) return;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    if (error) {
      if (import.meta.env.DEV) console.error('[tasks-tab] load users failed', error);
      return;
    }
    setUsers((data as UserOption[]) ?? []);
  }, [canCrud]);

  useEffect(() => {
    setRows(null);
    setEditingId(null);
    setAdding(false);
    setDraft(EMPTY_DRAFT);
    void load();
  }, [load]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function resetForm() {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function startAdd() {
    setEditingId(null);
    setAdding(true);
    setDraft(EMPTY_DRAFT);
  }

  function startEdit(row: TaskRow) {
    setAdding(false);
    setEditingId(row.id);
    setDraft({
      title: row.title,
      description: row.description ?? '',
      status: row.status,
      priority: row.priority,
      assignee_id: row.assignee_id ?? '',
      due_date: toDatetimeInput(row.due_date),
    });
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const list = rows ?? [];
    const nextOrder = list.length ? Math.max(...list.map((r) => r.sort_order)) + 1 : 0;
    const { error } = await supabase.from('tasks').insert({
      project_id: projectId,
      boq_line_item_id: lineId,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      priority: draft.priority,
      assignee_id: draft.assignee_id || null,
      due_date: fromDatetimeInput(draft.due_date),
      sort_order: nextOrder,
    });
    setSaving(false);
    if (error) {
      toast.error(t('common.errorToast'), { description: error.message });
      return;
    }
    toast.success(t('common.createdToast'));
    resetForm();
    await load();
  }

  async function handleEdit(e: FormEvent, id: string) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('tasks')
      .update({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        status: draft.status,
        priority: draft.priority,
        assignee_id: draft.assignee_id || null,
        due_date: fromDatetimeInput(draft.due_date),
      })
      .eq('id', id);
    setSaving(false);
    if (error) {
      toast.error(t('common.errorToast'), { description: error.message });
      return;
    }
    toast.success(t('common.savedToast'));
    resetForm();
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t('workspace.tasks.confirmDelete'))) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      toast.error(t('common.errorToast'), { description: error.message });
      return;
    }
    toast.success(t('common.deletedToast'));
    await load();
  }

  async function handleStatusChange(id: string, next: TaskStatus) {
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', id);
    if (error) {
      toast.error(t('common.errorToast'), { description: error.message });
      return;
    }
    await load();
  }

  if (rows === null) {
    return <SkeletonRows count={4} />;
  }

  if (rows.length === 0 && !adding) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={ListChecks}
          title={t('workspace.tasks.empty')}
          description={t('workspace.tasks.emptyHint')}
          cta={
            canCrud
              ? { label: t('workspace.tasks.add'), onClick: () => setAdding(true) }
              : undefined
          }
        />
      </div>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  const statusOptions: ReadonlyArray<SegmentedControlOption<TaskStatus>> = STATUSES.map((s) => ({
    value: s,
    label: t(`tasks.status.${s}`),
  }));

  function renderForm(idSuffix: string, onSubmit: (e: FormEvent) => void, isEdit: boolean) {
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label htmlFor={`task-title-${idSuffix}`}>{t('workspace.tasks.field.title')} *</Label>
          <Input
            id={`task-title-${idSuffix}`}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
            autoFocus
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor={`task-desc-${idSuffix}`}>{t('workspace.tasks.field.description')}</Label>
          <Input
            id={`task-desc-${idSuffix}`}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            disabled={saving}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`task-status-${idSuffix}`}>{t('workspace.tasks.field.status')}</Label>
            <select
              id={`task-status-${idSuffix}`}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
              disabled={saving}
              className={SELECT_CLASS}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`tasks.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`task-priority-${idSuffix}`}>
              {t('workspace.tasks.field.priority')}
            </Label>
            <select
              id={`task-priority-${idSuffix}`}
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}
              disabled={saving}
              className={SELECT_CLASS}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`tasks.priority.${p}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`task-assignee-${idSuffix}`}>
              {t('workspace.tasks.field.assignee')}
            </Label>
            <select
              id={`task-assignee-${idSuffix}`}
              value={draft.assignee_id}
              onChange={(e) => setDraft({ ...draft, assignee_id: e.target.value })}
              disabled={saving}
              className={SELECT_CLASS}
            >
              <option value="">{t('workspace.tasks.field.unassigned')}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`task-due-${idSuffix}`}>{t('workspace.tasks.field.dueDate')}</Label>
            <Input
              id={`task-due-${idSuffix}`}
              type="datetime-local"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              disabled={saving}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetForm}
            disabled={saving}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            {isEdit ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isEditing = editingId === row.id;
        const canChangeStatus =
          canCrud || (canEditOwn && row.assignee_id != null && row.assignee_id === (user?.id ?? ''));

        return (
          <article
            key={row.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
          >
            {isEditing ? (
              renderForm(row.id, (e) => handleEdit(e, row.id), true)
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <StatusBadge
                      family="task"
                      value={row.status}
                      label={t(`tasks.status.${row.status}`)}
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{row.title}</div>
                      {row.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {row.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          {row.assignee?.full_name ?? t('workspace.tasks.field.unassigned')}
                        </span>
                        {row.due_date && (
                          <span>· {dateFmt.format(new Date(row.due_date))}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      family="task_priority"
                      value={row.priority}
                      label={t(`tasks.priority.${row.priority}`)}
                    />
                    {canCrud && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => startEdit(row)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(row.id)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {canChangeStatus && (
                  <div className="mt-3">
                    <SegmentedControl
                      value={row.status}
                      onChange={(next) => void handleStatusChange(row.id, next)}
                      options={statusOptions}
                      ariaLabel={t('workspace.tasks.field.status')}
                    />
                  </div>
                )}
              </>
            )}
          </article>
        );
      })}

      {adding ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          {renderForm('new', handleAdd, false)}
        </div>
      ) : (
        canCrud && (
          <button
            type="button"
            onClick={startAdd}
            className="w-full text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 border border-dashed border-primary/40 rounded-2xl py-3 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('workspace.tasks.add')}
          </button>
        )
      )}
    </div>
  );
}
