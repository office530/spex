import {
  Button,
  Comment,
  CommentThread,
  EmptyState,
  Input,
  Label,
  SegmentedControl,
  type SegmentedControlOption,
  SkeletonRows,
} from '@spex/ui';
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../../auth/AuthContext';
import { supabase } from '../../../lib/supabase';
import type { QcCheckStatus } from '../../../lib/qcHelpers';

interface QcCheck {
  id: string;
  description: string;
  status: QcCheckStatus;
  due_date: string | null;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  assignee: { full_name: string } | null;
}

interface QcComment {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
}

interface QcTabProps {
  lineId: string;
  canCrud: boolean;     // back-office or PM of project
  canComment: boolean;  // any project member
}

const STATUS_TONE: Record<QcCheckStatus, { ring: string; bg: string; text: string }> = {
  pending:     { ring: 'ring-slate-200',   bg: 'bg-slate-100',   text: 'text-slate-400' },
  in_progress: { ring: 'ring-blue-200',    bg: 'bg-blue-100',    text: 'text-blue-700' },
  done:        { ring: 'ring-emerald-200', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  failed:      { ring: 'ring-rose-200',    bg: 'bg-rose-100',    text: 'text-rose-700' },
  waiting:     { ring: 'ring-amber-200',   bg: 'bg-amber-100',   text: 'text-amber-700' },
};

const STATUS_DOT_ICON: Record<QcCheckStatus, 'check' | 'circle' | 'x'> = {
  pending: 'circle',
  in_progress: 'circle',
  done: 'check',
  failed: 'x',
  waiting: 'circle',
};

export function QcTab({ lineId, canCrud, canComment }: QcTabProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [checks, setChecks] = useState<QcCheck[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ description: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, QcComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('boq_line_item_checks')
      .select(
        'id, description, status, due_date, notes, sort_order, created_by, assignee:user_profiles!boq_line_item_checks_assigned_to_fkey(full_name)',
      )
      .eq('line_item_id', lineId)
      .order('sort_order', { ascending: true });
    if (error) {
      if (import.meta.env.DEV) console.error('[qc] load failed', error);
      setChecks([]);
      return;
    }
    setChecks((data as unknown as QcCheck[]) ?? []);
  }, [lineId]);

  useEffect(() => {
    setChecks(null);
    setExpandedId(null);
    setComments({});
    void load();
  }, [load]);

  async function loadComments(qcId: string) {
    const { data } = await supabase
      .from('boq_qc_comments')
      .select('id, body, created_at, author:user_profiles!boq_qc_comments_author_id_fkey(full_name)')
      .eq('qc_check_id', qcId)
      .order('created_at', { ascending: true });
    setComments((prev) => ({ ...prev, [qcId]: (data as unknown as QcComment[]) ?? [] }));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return;
    setSaving(true);
    const sortOrder = (checks?.length ?? 0) + 1;
    const { error } = await supabase.from('boq_line_item_checks').insert({
      line_item_id: lineId,
      description: draft.description.trim(),
      due_date: draft.due_date || null,
      sort_order: sortOrder,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    toast.success(t('common.createdToast'));
    setDraft({ description: '', due_date: '' });
    setAdding(false);
    setEditingId(null);
    await load();
  }

  async function handleEdit(e: FormEvent, id: string) {
    e.preventDefault();
    if (!draft.description.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('boq_line_item_checks')
      .update({
        description: draft.description.trim(),
        due_date: draft.due_date || null,
      })
      .eq('id', id);
    setSaving(false);
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    toast.success(t('common.savedToast'));
    setEditingId(null);
    setDraft({ description: '', due_date: '' });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t('qc.confirmDelete'))) return;
    const { error } = await supabase.from('boq_line_item_checks').delete().eq('id', id);
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    toast.success(t('common.deletedToast'));
    await load();
  }

  async function handleStatusChange(id: string, next: QcCheckStatus) {
    const completedAt =
      next === 'done' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('boq_line_item_checks')
      .update({
        status: next,
        completed_by: next === 'done' ? user?.id ?? null : null,
        completed_at: completedAt,
      })
      .eq('id', id);
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    await load();
  }

  function toggleExpand(qcId: string) {
    if (expandedId === qcId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(qcId);
    if (!comments[qcId]) {
      void loadComments(qcId);
    }
  }

  async function handleComment(e: FormEvent, qcId: string) {
    e.preventDefault();
    const body = commentDraft[qcId]?.trim();
    if (!body) return;
    const { error } = await supabase.from('boq_qc_comments').insert({
      qc_check_id: qcId,
      author_id: user?.id ?? null,
      body,
    });
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    setCommentDraft((prev) => ({ ...prev, [qcId]: '' }));
    await loadComments(qcId);
  }

  if (checks === null) {
    return <SkeletonRows count={4} />;
  }

  if (checks.length === 0 && !adding) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={ClipboardCheck}
          title={t('qc.empty')}
          description={t('qc.emptyHint')}
          cta={canCrud ? { label: t('qc.add'), onClick: () => setAdding(true) } : undefined}
        />
      </div>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  const statusOptions: ReadonlyArray<SegmentedControlOption<QcCheckStatus>> = [
    { value: 'pending', label: t('qc.status.pending') },
    { value: 'in_progress', label: t('qc.status.in_progress') },
    { value: 'done', label: t('qc.status.done') },
    { value: 'waiting', label: t('qc.status.waiting') },
    { value: 'failed', label: t('qc.status.failed') },
  ];

  return (
    <div className="space-y-3">
      {checks.map((check) => {
        const isEditing = editingId === check.id;
        const isExpanded = expandedId === check.id;
        const tone = STATUS_TONE[check.status];
        const dotIcon = STATUS_DOT_ICON[check.status];
        const thread = comments[check.id] ?? [];

        return (
          <article
            key={check.id}
            className={`rounded-lg border p-4 ${
              check.status === 'failed' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'
            }`}
          >
            {isEditing ? (
              <form onSubmit={(e) => handleEdit(e, check.id)} className="space-y-3">
                <div>
                  <Label htmlFor={`qc-desc-${check.id}`}>{t('qc.field.description')} *</Label>
                  <Input
                    id={`qc-desc-${check.id}`}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor={`qc-due-${check.id}`}>{t('qc.field.dueDate')}</Label>
                  <Input
                    id={`qc-due-${check.id}`}
                    type="date"
                    value={draft.due_date}
                    onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setDraft({ description: '', due_date: '' });
                    }}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" loading={saving}>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={`h-7 w-7 rounded-full grid place-items-center shrink-0 ring-2 ${tone.ring} ${tone.bg}`}
                    >
                      {dotIcon === 'check' ? (
                        <svg className={`w-4 h-4 ${tone.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : dotIcon === 'x' ? (
                        <svg className={`w-4 h-4 ${tone.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full ${tone.bg.replace('100', '400')}`} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{check.description}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        {check.assignee && (
                          <span>{t('qc.field.assignedTo')}: {check.assignee.full_name}</span>
                        )}
                        {check.due_date && (
                          <span>· {dateFmt.format(new Date(check.due_date))}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SegmentedControl
                      value={check.status}
                      onChange={(next) => void handleStatusChange(check.id, next)}
                      options={statusOptions}
                      ariaLabel={t('qc.field.status')}
                    />
                    {canCrud && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingId(check.id);
                            setDraft({
                              description: check.description,
                              due_date: check.due_date ?? '',
                            });
                            setAdding(false);
                          }}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(check.id)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  onClick={() => toggleExpand(check.id)}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {comments[check.id]
                    ? t('qc.commentsCount', { count: (comments[check.id] ?? []).length })
                    : t('qc.viewComments')}
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2.5">
                    {comments[check.id] === undefined ? (
                      <div className="text-xs text-muted-foreground italic px-2">
                        {t('common.loading')}
                      </div>
                    ) : thread.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic px-2">
                        {t('qc.commentEmpty')}
                      </div>
                    ) : (
                      <CommentThread>
                        {thread.map((c) => (
                          <Comment
                            key={c.id}
                            authorName={c.author?.full_name ?? '—'}
                            timestamp={dateFmt.format(new Date(c.created_at))}
                          >
                            {c.body}
                          </Comment>
                        ))}
                      </CommentThread>
                    )}
                    {canComment && (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => void handleComment(e, check.id)}
                      >
                        <Input
                          value={commentDraft[check.id] ?? ''}
                          onChange={(e) =>
                            setCommentDraft((p) => ({ ...p, [check.id]: e.target.value }))
                          }
                          placeholder={t('qc.commentPlaceholder')}
                          autoComplete="off"
                        />
                        <Button type="submit" size="sm">
                          {t('common.send')}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
          </article>
        );
      })}

      {adding ? (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3"
        >
          <div>
            <Label htmlFor="qc-new-desc">{t('qc.field.description')} *</Label>
            <Input
              id="qc-new-desc"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={t('qc.newPlaceholder')}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="qc-new-due">{t('qc.field.dueDate')}</Label>
            <Input
              id="qc-new-due"
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setDraft({ description: '', due_date: '' });
              }}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              {t('common.add')}
            </Button>
          </div>
        </form>
      ) : (
        canCrud && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="w-full text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 border border-dashed border-primary/40 rounded-lg py-2.5 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('qc.add')}
          </button>
        )
      )}
    </div>
  );
}
