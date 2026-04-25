import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from '@spex/ui';
import { CalendarDays, Download } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { MeetingPdfActionItem } from '../../lib/pdf/MeetingPdf';
import { supabase } from '../../lib/supabase';
import { toDatetimeInput, fromDatetimeInput } from './format';

type MeetingType = 'supervision' | 'handover' | 'planning';

const TYPES: MeetingType[] = ['supervision', 'handover', 'planning'];

interface ActionItemRow {
  id: string;
  meeting_id: string;
  summary: string;
  assignee_id: string | null;
  due_date: string | null;
  assignee: { full_name: string } | null;
}

interface MeetingRow {
  id: string;
  title: string;
  type: MeetingType;
  held_at: string;
  decisions: string | null;
  action_items: ActionItemRow[];
}

interface UserOption {
  id: string;
  full_name: string;
}

export function MeetingsPanel({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<MeetingRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    type: 'supervision' as MeetingType,
    held_at: '',
    decisions: '',
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [mRes, aRes, uRes] = await Promise.all([
      supabase
        .from('meeting_minutes')
        .select('id, title, type, held_at, decisions')
        .eq('project_id', projectId)
        .order('held_at', { ascending: false }),
      supabase
        .from('action_items')
        .select(
          'id, meeting_id, summary, assignee_id, due_date, assignee:user_profiles(full_name)',
        ),
      canWrite && users.length === 0
        ? supabase
            .from('user_profiles')
            .select('id, full_name')
            .eq('is_active', true)
            .order('full_name')
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (mRes.error) setError(mRes.error.message);
    else {
      const meetings = (mRes.data as Array<Omit<MeetingRow, 'action_items'>>) ?? [];
      const actions = (aRes.data as unknown as ActionItemRow[]) ?? [];
      setRows(
        meetings.map((m) => ({
          ...m,
          action_items: actions.filter((a) => a.meeting_id === m.id),
        })),
      );
    }
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
      type: 'supervision',
      held_at: toDatetimeInput(new Date().toISOString()),
      decisions: '',
    });
    setError(null);
    setAdding(true);
  }

  function startEdit(r: MeetingRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      title: r.title,
      type: r.type,
      held_at: toDatetimeInput(r.held_at),
      decisions: r.decisions ?? '',
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
      type: form.type,
      held_at: fromDatetimeInput(form.held_at),
      decisions: form.decisions || null,
    };
    const { error } = adding
      ? await supabase.from('meeting_minutes').insert({ ...payload, project_id: projectId })
      : await supabase.from('meeting_minutes').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancel();
    await refresh();
  }

  async function remove(r: MeetingRow) {
    if (!confirm(t('meetings.confirmDelete'))) return;
    const { error } = await supabase.from('meeting_minutes').delete().eq('id', r.id);
    if (error) setError(error.message);
    else await refresh();
  }

  async function exportPdf(r: MeetingRow) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .maybeSingle();
    const projName = (project as { name: string } | null)?.name ?? '—';
    const items: MeetingPdfActionItem[] = r.action_items.map((a) => ({
      id: a.id,
      description: a.summary,
      assignee: a.assignee?.full_name ?? null,
      due_date: a.due_date,
    }));
    try {
      const [{ MeetingPdf }, { downloadPdf }] = await Promise.all([
        import('../../lib/pdf/MeetingPdf'),
        import('../../lib/pdf/download'),
      ]);
      await downloadPdf(
        <MeetingPdf
          projectName={projName}
          meetingTitle={r.title}
          meetingDate={r.held_at}
          attendeesText={null}
          bodyText={r.decisions}
          actionItems={items}
          generatedAtLabel={t('meetings.generatedAt', { defaultValue: 'הופק על ידי Spex' })}
        />,
        `meeting-${r.title.replace(/\s+/g, '-')}-${r.held_at.slice(0, 10)}.pdf`,
      );
    } catch (e) {
      toast.error(t('common.errorToast'), {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="mt_title">{t('meetings.titleLabel')} *</Label>
            <Input
              id="mt_title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mt_type">{t('meetings.typeLabel')}</Label>
            <select
              id="mt_type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MeetingType }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {TYPES.map((t2) => (
                <option key={t2} value={t2}>{t(`meetings.type.${t2}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mt_held_at">{t('meetings.heldAt')} *</Label>
            <Input
              id="mt_held_at"
              type="datetime-local"
              value={form.held_at}
              onChange={(e) => setForm((f) => ({ ...f, held_at: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="mt_decisions">{t('meetings.decisions')}</Label>
            <textarea
              id="mt_decisions"
              value={form.decisions}
              onChange={(e) => setForm((f) => ({ ...f, decisions: e.target.value }))}
              rows={4}
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
        <CardTitle className="text-base">{t('meetings.title')}</CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('meetings.add')}
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
              <EmptyState
                icon={CalendarDays}
                title={t('meetings.empty')}
                cta={canWrite ? { label: t('meetings.add'), onClick: startAdd } : undefined}
              />
            ) : (
              rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <div key={r.id} className="px-6 py-3 space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{r.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t(`meetings.type.${r.type}`)} · {dateFormat.format(new Date(r.held_at))}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void exportPdf(r)}
                          className="gap-1"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t('meetings.exportPdf')}
                        </Button>
                        {canWrite && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                    {r.decisions && (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {r.decisions}
                      </p>
                    )}
                    <ActionItemsList
                      meetingId={r.id}
                      items={r.action_items}
                      users={users}
                      canWrite={canWrite}
                      onChange={refresh}
                    />
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

interface ActionItemsListProps {
  meetingId: string;
  items: ActionItemRow[];
  users: UserOption[];
  canWrite: boolean;
  onChange: () => void | Promise<void>;
}

function ActionItemsList({ meetingId, items, users, canWrite, onChange }: ActionItemsListProps) {
  const { t, i18n } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    summary: '',
    assignee_id: '',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addAction(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('action_items').insert({
      meeting_id: meetingId,
      summary: form.summary,
      assignee_id: form.assignee_id || null,
      due_date: fromDatetimeInput(form.due_date),
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setAdding(false);
    setForm({ summary: '', assignee_id: '', due_date: '' });
    await onChange();
  }

  async function removeAction(a: ActionItemRow) {
    if (!confirm(t('meetings.confirmDeleteAction'))) return;
    const { error } = await supabase.from('action_items').delete().eq('id', a.id);
    if (error) setError(error.message);
    else await onChange();
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">{t('meetings.actionItems')}</div>
        {canWrite && !adding && (
          <Button size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs" onClick={() => setAdding(true)}>
            {t('meetings.addAction')}
          </Button>
        )}
      </div>
      {items.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">{t('meetings.emptyActions')}</p>
      ) : (
        <div className="space-y-1">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 text-sm bg-background rounded px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="truncate">{a.summary}</div>
                <div className="text-xs text-muted-foreground">
                  {a.assignee?.full_name ?? t('tasks.noAssignee')}
                  {a.due_date && <span> · {dateFormat.format(new Date(a.due_date))}</span>}
                </div>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive h-auto px-2 py-1"
                  onClick={() => void removeAction(a)}
                >
                  {t('common.delete')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {adding && (
        <form onSubmit={addAction} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] items-end bg-background rounded p-3">
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor={`ai_sum_${meetingId}`} className="text-xs">
              {t('meetings.actionSummary')} *
            </Label>
            <Input
              id={`ai_sum_${meetingId}`}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ai_as_${meetingId}`} className="text-xs">
              {t('tasks.assignee')}
            </Label>
            <select
              id={`ai_as_${meetingId}`}
              value={form.assignee_id}
              onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
              disabled={saving}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('tasks.noAssignee')}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ai_due_${meetingId}`} className="text-xs">
              {t('tasks.dueDate')}
            </Label>
            <Input
              id={`ai_due_${meetingId}`}
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t('common.saving') : t('common.add')}
            </Button>
          </div>
          {error && (
            <p className="sm:col-span-4 text-sm text-destructive" role="alert">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
