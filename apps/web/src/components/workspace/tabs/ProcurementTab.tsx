import {
  Button,
  EmptyState,
  formatCurrencyILS,
  Input,
  Label,
  SegmentedControl,
  type SegmentedControlOption,
  SkeletonRows,
  StatusBadge,
} from '@spex/ui';
import { Award, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

type SupplierQuoteStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revised';

const STATUSES: SupplierQuoteStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'revised',
];

interface QuoteRow {
  id: string;
  amount: number | null;
  status: SupplierQuoteStatus;
  notes: string | null;
  supplier_id: string;
  supplier: { id: string; name: string } | null;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface ProcurementTabProps {
  lineId: string;
  projectId: string;
  canCrud: boolean;
}

const inputCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50';

interface QuoteDraft {
  supplier_id: string;
  amount: string;
  status: SupplierQuoteStatus;
  notes: string;
}

const EMPTY_DRAFT: QuoteDraft = { supplier_id: '', amount: '', status: 'draft', notes: '' };

export function ProcurementTab({ lineId, projectId, canCrud }: ProcurementTabProps) {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<QuoteRow[] | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('supplier_quotes')
      .select('id, amount, status, notes, supplier_id, supplier:suppliers!supplier_id(id, name)')
      .eq('boq_line_item_id', lineId)
      .order('amount', { ascending: true, nullsFirst: false });
    if (error) {
      if (import.meta.env.DEV) console.error('[procurement] load failed', error);
      setQuotes([]);
      return;
    }
    setQuotes((data as unknown as QuoteRow[]) ?? []);
  }, [lineId]);

  useEffect(() => {
    setQuotes(null);
    void load();
  }, [load]);

  useEffect(() => {
    if (!canCrud) return;
    if (suppliers.length > 0) return;
    void (async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      setSuppliers((data as SupplierOption[]) ?? []);
    })();
  }, [canCrud, suppliers.length]);

  function startAdd() {
    setEditingId(null);
    setDraft({
      supplier_id: suppliers[0]?.id ?? '',
      amount: '',
      status: 'draft',
      notes: '',
    });
    setAdding(true);
  }

  function startEdit(q: QuoteRow) {
    setAdding(false);
    setEditingId(q.id);
    setDraft({
      supplier_id: q.supplier_id,
      amount: q.amount?.toString() ?? '',
      status: q.status,
      notes: q.notes ?? '',
    });
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.supplier_id) return;
    setSaving(true);
    const payload = {
      supplier_id: draft.supplier_id,
      amount: draft.amount ? Number(draft.amount) : null,
      status: draft.status,
      notes: draft.notes || null,
    };
    const { error } = adding
      ? await supabase.from('supplier_quotes').insert({
          ...payload,
          project_id: projectId,
          boq_line_item_id: lineId,
        })
      : await supabase.from('supplier_quotes').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) {
      toast.error(t('common.errorToast'), { description: error.message });
      return;
    }
    toast.success(adding ? t('common.createdToast') : t('common.savedToast'));
    cancel();
    await load();
  }

  async function handleDelete(q: QuoteRow) {
    if (!confirm(t('workspace.procurement.confirmDelete'))) return;
    const { error } = await supabase.from('supplier_quotes').delete().eq('id', q.id);
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    toast.success(t('common.deletedToast'));
    await load();
  }

  async function handleStatusChange(id: string, next: SupplierQuoteStatus) {
    const { error } = await supabase
      .from('supplier_quotes')
      .update({ status: next })
      .eq('id', id);
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    await load();
  }

  if (quotes === null) {
    return <SkeletonRows count={3} />;
  }

  if (quotes.length === 0 && !adding) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Truck}
          title={t('workspace.procurement.empty')}
          description={t('workspace.procurement.emptyHint')}
          cta={canCrud ? { label: t('workspace.procurement.add'), onClick: startAdd } : undefined}
        />
        <div className="flex justify-center">
          <Link
            to={`/projects/${projectId}/boq`}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t('workspace.procurement.openInBoq')} ←
          </Link>
        </div>
      </div>
    );
  }

  const statusOptions: ReadonlyArray<SegmentedControlOption<SupplierQuoteStatus>> = STATUSES.map(
    (s) => ({ value: s, label: t(`supplierQuotes.status.${s}`) }),
  );

  const cheapest = quotes.reduce<QuoteRow | null>((min, q) => {
    if (q.amount == null) return min;
    if (!min || (min.amount ?? Infinity) > q.amount) return q;
    return min;
  }, null);

  return (
    <div className="space-y-3">
      {quotes.map((q) => {
        const isEditing = editingId === q.id;
        const isCheapest = cheapest && q.id === cheapest.id;
        const delta =
          cheapest && !isCheapest && q.amount != null && cheapest.amount != null
            ? q.amount - cheapest.amount
            : null;
        const cardCls = isCheapest
          ? 'rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 transition-shadow hover:shadow-sm'
          : 'rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm';

        if (isEditing) {
          return (
            <article key={q.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <QuoteForm
                draft={draft}
                onChange={setDraft}
                onSubmit={handleSubmit}
                onCancel={cancel}
                saving={saving}
                suppliers={suppliers}
                statusOptions={STATUSES}
                lineId={`edit-${q.id}`}
                t={t}
                inputCls={inputCls}
              />
            </article>
          );
        }

        return (
          <article key={q.id} className={cardCls}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">
                    {q.supplier?.name ?? '—'}
                  </h4>
                  {isCheapest && (
                    <StatusBadge
                      family="flag"
                      value="cheapest"
                      label={t('supplierQuotes.cheapest')}
                      className="gap-1 shrink-0"
                    >
                      <Award className="w-3 h-3" aria-hidden />
                      {t('supplierQuotes.cheapest')}
                    </StatusBadge>
                  )}
                </div>
                {q.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{q.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-end">
                  <div className="text-lg nums font-semibold text-slate-900">
                    {q.amount != null ? formatCurrencyILS(q.amount) : '—'}
                  </div>
                  {delta != null && delta > 0 && (
                    <div className="text-[10px] text-muted-foreground nums mt-0.5">
                      +{formatCurrencyILS(delta)}
                    </div>
                  )}
                </div>
                {canCrud && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => startEdit(q)}
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => void handleDelete(q)}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              {canCrud ? (
                <SegmentedControl
                  value={q.status}
                  onChange={(next) => void handleStatusChange(q.id, next)}
                  options={statusOptions}
                  ariaLabel={t('workspace.procurement.statusAria')}
                />
              ) : (
                <StatusBadge
                  family="supplier_quote"
                  value={q.status}
                  label={t(`supplierQuotes.status.${q.status}`)}
                />
              )}
            </div>
          </article>
        );
      })}

      {adding ? (
        <article className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <QuoteForm
            draft={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            onCancel={cancel}
            saving={saving}
            suppliers={suppliers}
            statusOptions={STATUSES}
            lineId="new"
            t={t}
            inputCls={inputCls}
          />
        </article>
      ) : (
        canCrud && (
          <button
            type="button"
            onClick={startAdd}
            className="w-full text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 border border-dashed border-primary/40 rounded-2xl py-3 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('workspace.procurement.add')}
          </button>
        )
      )}

      <div className="flex justify-end pt-1">
        <Link
          to={`/projects/${projectId}/boq`}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {t('workspace.procurement.openInBoq')} ←
        </Link>
      </div>
    </div>
  );
}

interface QuoteFormProps {
  draft: QuoteDraft;
  onChange: (next: QuoteDraft) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  suppliers: SupplierOption[];
  statusOptions: SupplierQuoteStatus[];
  lineId: string;
  t: (key: string) => string;
  inputCls: string;
}

function QuoteForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  saving,
  suppliers,
  statusOptions,
  lineId,
  t,
  inputCls,
}: QuoteFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`q-sup-${lineId}`} className="text-xs">
            {t('workspace.procurement.supplier')} *
          </Label>
          <select
            id={`q-sup-${lineId}`}
            value={draft.supplier_id}
            onChange={(e) => onChange({ ...draft, supplier_id: e.target.value })}
            required
            disabled={saving}
            className={inputCls}
          >
            <option value="">{t('workspace.procurement.selectSupplier')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`q-amt-${lineId}`} className="text-xs">
            {t('workspace.procurement.amount')}
          </Label>
          <Input
            id={`q-amt-${lineId}`}
            type="number"
            min="0"
            value={draft.amount}
            onChange={(e) => onChange({ ...draft, amount: e.target.value })}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`q-st-${lineId}`} className="text-xs">
            {t('workspace.procurement.statusLabel')}
          </Label>
          <select
            id={`q-st-${lineId}`}
            value={draft.status}
            onChange={(e) =>
              onChange({ ...draft, status: e.target.value as SupplierQuoteStatus })
            }
            disabled={saving}
            className={inputCls}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {t(`supplierQuotes.status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`q-notes-${lineId}`} className="text-xs">
            {t('workspace.procurement.notes')}
          </Label>
          <textarea
            id={`q-notes-${lineId}`}
            value={draft.notes}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            placeholder={t('workspace.procurement.notesPlaceholder')}
            rows={2}
            disabled={saving}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-y min-h-[60px]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={!draft.supplier_id}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
