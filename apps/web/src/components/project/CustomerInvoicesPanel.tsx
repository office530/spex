import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePicker,
  EmptyState,
  formatCurrencyILS,
  fromDateInput,
  Input,
  Label,
  StatusBadge,
  toDateInput,
} from '@spex/ui';
import { Receipt, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { enqueueChashbashvatSync, type SyncStatus } from '../../lib/chashbashvat';
import { defaultInvoiceDueDate } from '../../lib/invoiceDefaults';
import { supabase } from '../../lib/supabase';

type InvoiceKind = 'tax_invoice' | 'deal_invoice';
type InvoiceStatus =
  | 'awaiting_issuance'
  | 'issued'
  | 'paid'
  | 'overdue'
  | 'cancelled';

const KINDS: InvoiceKind[] = ['tax_invoice', 'deal_invoice'];
const STATUSES: InvoiceStatus[] = ['awaiting_issuance', 'issued', 'paid', 'overdue', 'cancelled'];

interface MilestoneOption {
  id: string;
  name: string;
}

interface ReceiptRow {
  id: string;
  invoice_id: string;
  amount: number;
  received_at: string;
}

interface InvoiceRow {
  id: string;
  milestone_id: string | null;
  kind: InvoiceKind;
  status: InvoiceStatus;
  amount: number;
  due_date: string | null;
  issued_at: string | null;
  paid_at: string | null;
  notes: string | null;
  chashbashvat_sync_status: SyncStatus | null;
  milestone: { name: string } | null;
  receipts: ReceiptRow[];
}

interface InvoiceForm {
  milestone_id: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  amount: string;
  due_date: string;
  issued_at: string;
  paid_at: string;
  notes: string;
}

const EMPTY_FORM: InvoiceForm = {
  milestone_id: '',
  kind: 'tax_invoice',
  status: 'awaiting_issuance',
  amount: '',
  due_date: '',
  issued_at: '',
  paid_at: '',
  notes: '',
};

export function CustomerInvoicesPanel({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [invRes, recRes, msRes] = await Promise.all([
      supabase
        .from('customer_invoices')
        .select(
          'id, milestone_id, kind, status, amount, due_date, issued_at, paid_at, notes, chashbashvat_sync_status, milestone:milestones(name)',
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_receipts')
        .select('id, invoice_id, amount, received_at')
        .in(
          'invoice_id',
          (
            await supabase
              .from('customer_invoices')
              .select('id')
              .eq('project_id', projectId)
          ).data?.map((r: { id: string }) => r.id) ?? [],
        ),
      canWrite && milestones.length === 0
        ? supabase
            .from('milestones')
            .select('id, name')
            .eq('project_id', projectId)
            .order('sort_order')
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (invRes.error) setError(invRes.error.message);
    else {
      const invs = (invRes.data as unknown as Array<Omit<InvoiceRow, 'receipts'>>) ?? [];
      const recs = (recRes.data as ReceiptRow[]) ?? [];
      setRows(
        invs.map((i) => ({
          ...i,
          receipts: recs.filter((r) => r.invoice_id === i.id),
        })),
      );
    }
    if (msRes.data) setMilestones(msRes.data as MilestoneOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setAdding(true);
  }

  function startEdit(r: InvoiceRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      milestone_id: r.milestone_id ?? '',
      kind: r.kind,
      status: r.status,
      amount: String(r.amount),
      due_date: toDateInput(r.due_date),
      issued_at: toDateInput(r.issued_at),
      paid_at: toDateInput(r.paid_at),
      notes: r.notes ?? '',
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
    if (!form.amount) return;
    setSaving(true);
    setError(null);
    const effectiveDueDate = defaultInvoiceDueDate({
      status: form.status,
      dueDate: form.due_date,
      issuedAt: form.issued_at,
    });
    const payload = {
      milestone_id: form.milestone_id || null,
      kind: form.kind,
      status: form.status,
      amount: Number(form.amount),
      due_date: fromDateInput(effectiveDueDate),
      issued_at: fromDateInput(form.issued_at),
      paid_at: fromDateInput(form.paid_at),
      notes: form.notes || null,
    };
    const { error: dbErr } = adding
      ? await supabase
          .from('customer_invoices')
          .insert({ ...payload, project_id: projectId })
      : await supabase.from('customer_invoices').update(payload).eq('id', editingId!);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    cancel();
    await refresh();
  }

  async function remove(r: InvoiceRow) {
    if (!confirm(t('customerInvoices.confirmDelete'))) return;
    const { error: delErr } = await supabase.from('customer_invoices').delete().eq('id', r.id);
    if (delErr) setError(delErr.message);
    else await refresh();
  }

  async function queueSync(r: InvoiceRow) {
    try {
      await enqueueChashbashvatSync({
        entityType: 'customer_invoice',
        entityId: r.id,
        operation: r.chashbashvat_sync_status ? 'update' : 'create',
        payload: {
          amount: r.amount,
          kind: r.kind,
          due_date: r.due_date,
          issued_at: r.issued_at,
          milestone_name: r.milestone?.name ?? null,
          notes: r.notes,
        },
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'sync enqueue failed');
    }
  }

  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="inv_milestone">{t('customerInvoices.milestone')}</Label>
            <select
              id="inv_milestone"
              value={form.milestone_id}
              onChange={(e) => setForm((f) => ({ ...f, milestone_id: e.target.value }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('customerInvoices.noMilestone')}</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv_kind">{t('customerInvoices.kindLabel')}</Label>
            <select
              id="inv_kind"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as InvoiceKind }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`customerInvoices.kind.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv_amount">{t('customerInvoices.amount')} *</Label>
            <Input
              id="inv_amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv_status">{t('customerInvoices.statusLabel')}</Label>
            <select
              id="inv_status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as InvoiceStatus }))
              }
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`customerInvoices.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv_due">{t('customerInvoices.dueDate')}</Label>
            <DatePicker
              id="inv_due"
              value={form.due_date || null}
              onChange={(v) => setForm((f) => ({ ...f, due_date: v ?? '' }))}
              disabled={saving}
              triggerLabel={t('customerInvoices.dueDate')}
              clearLabel={t('common.remove')}
              doneLabel={t('common.save')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv_issued">{t('customerInvoices.issuedAt')}</Label>
            <DatePicker
              id="inv_issued"
              value={form.issued_at || null}
              onChange={(v) => setForm((f) => ({ ...f, issued_at: v ?? '' }))}
              disabled={saving}
              triggerLabel={t('customerInvoices.issuedAt')}
              clearLabel={t('common.remove')}
              doneLabel={t('common.save')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv_paid">{t('customerInvoices.paidAt')}</Label>
            <DatePicker
              id="inv_paid"
              value={form.paid_at || null}
              onChange={(v) => setForm((f) => ({ ...f, paid_at: v ?? '' }))}
              disabled={saving}
              triggerLabel={t('customerInvoices.paidAt')}
              clearLabel={t('common.remove')}
              doneLabel={t('common.save')}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="inv_notes">{t('common.notes')}</Label>
            <textarea
              id="inv_notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={saving || !form.amount}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          {t('customerInvoices.title')}
          {rows.length > 0 && (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              ({formatCurrencyILS(total)})
            </span>
          )}
        </CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('customerInvoices.add')}
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
                icon={Receipt}
                title={t('customerInvoices.empty')}
                cta={canWrite ? { label: t('customerInvoices.add'), onClick: startAdd } : undefined}
              />
            ) : (
              rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <InvoiceRowDisplay
                    key={r.id}
                    row={r}
                    canWrite={canWrite}
                    onEdit={() => startEdit(r)}
                    onDelete={() => void remove(r)}
                    onSync={() => void queueSync(r)}
                    onReceiptChange={refresh}
                    dateFmt={dateFmt}
                  />
                ),
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface InvoiceRowDisplayProps {
  row: InvoiceRow;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSync: () => void;
  onReceiptChange: () => void | Promise<void>;
  dateFmt: Intl.DateTimeFormat;
}

function InvoiceRowDisplay({
  row,
  canWrite,
  onEdit,
  onDelete,
  onSync,
  onReceiptChange,
  dateFmt,
}: InvoiceRowDisplayProps) {
  const { t } = useTranslation();
  const receiptsTotal = row.receipts.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="px-6 py-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">{t(`customerInvoices.kind.${row.kind}`)}</div>
          <div className="text-xs text-muted-foreground">
            {row.milestone?.name && <span>{row.milestone.name}</span>}
            {row.milestone?.name && row.due_date && <span> · </span>}
            {row.due_date && (
              <span>
                {t('customerInvoices.dueDate')}: {dateFmt.format(new Date(row.due_date))}
              </span>
            )}
          </div>
          {row.notes && (
            <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{row.notes}</p>
          )}
        </div>
        <div className="shrink-0 text-sm font-medium">{formatCurrencyILS(row.amount)}</div>
        <StatusBadge
          family="customer_invoice"
          value={row.status}
          label={t(`customerInvoices.status.${row.status}`)}
          className="shrink-0"
        />
        {row.chashbashvat_sync_status && (
          <StatusBadge
            family="chashbashvat_sync"
            value={row.chashbashvat_sync_status}
            label={`${t('chashbashvat.label')} · ${t(`chashbashvat.status.${row.chashbashvat_sync_status}`)}`}
            className="shrink-0"
          />
        )}
        {canWrite && (
          <div className="shrink-0 flex items-center gap-1">
            {row.status === 'issued' && row.chashbashvat_sync_status !== 'synced' && (
              <Button size="sm" variant="ghost" onClick={onSync}>
                <Send className="h-3.5 w-3.5 me-1" />
                {t('chashbashvat.queueSync')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onEdit}>
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              {t('common.delete')}
            </Button>
          </div>
        )}
      </div>
      <ReceiptsList
        invoiceId={row.id}
        receipts={row.receipts}
        canWrite={canWrite}
        onChange={onReceiptChange}
        receiptsTotal={receiptsTotal}
        dateFmt={dateFmt}
      />
    </div>
  );
}

interface ReceiptsListProps {
  invoiceId: string;
  receipts: ReceiptRow[];
  canWrite: boolean;
  onChange: () => void | Promise<void>;
  receiptsTotal: number;
  dateFmt: Intl.DateTimeFormat;
}

function ReceiptsList({
  invoiceId,
  receipts,
  canWrite,
  onChange,
  receiptsTotal,
  dateFmt,
}: ReceiptsListProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addReceipt(e: FormEvent) {
    e.preventDefault();
    if (!amount || !receivedAt) return;
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase.from('customer_receipts').insert({
      invoice_id: invoiceId,
      amount: Number(amount),
      received_at: fromDateInput(receivedAt),
    });
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    setAdding(false);
    setAmount('');
    setReceivedAt('');
    await onChange();
  }

  async function removeReceipt(r: ReceiptRow) {
    if (!confirm(t('customerInvoices.confirmDeleteReceipt'))) return;
    const { error: delErr } = await supabase.from('customer_receipts').delete().eq('id', r.id);
    if (delErr) setError(delErr.message);
    else await onChange();
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          {t('customerInvoices.receipts')}
          {receipts.length > 0 && (
            <span className="ms-2">({formatCurrencyILS(receiptsTotal)})</span>
          )}
        </div>
        {canWrite && !adding && (
          <Button size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs" onClick={() => setAdding(true)}>
            {t('customerInvoices.addReceipt')}
          </Button>
        )}
      </div>
      {receipts.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">{t('customerInvoices.emptyReceipts')}</p>
      ) : (
        <div className="space-y-1">
          {receipts.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 text-sm bg-background rounded px-3 py-2"
            >
              <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                {dateFmt.format(new Date(r.received_at))}
              </div>
              <div className="shrink-0 font-medium">{formatCurrencyILS(r.amount)}</div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive h-auto px-2 py-1"
                  onClick={() => void removeReceipt(r)}
                >
                  {t('common.delete')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {adding && (
        <form onSubmit={addReceipt} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end bg-background rounded p-3">
          <div className="space-y-1">
            <Label htmlFor={`rec_amt_${invoiceId}`} className="text-xs">
              {t('customerInvoices.receiptAmount')} *
            </Label>
            <Input
              id={`rec_amt_${invoiceId}`}
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`rec_at_${invoiceId}`} className="text-xs">
              {t('customerInvoices.receivedAt')} *
            </Label>
            <Input
              id={`rec_at_${invoiceId}`}
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving || !amount || !receivedAt}>
              {saving ? t('common.saving') : t('common.add')}
            </Button>
          </div>
          {error && <p className="sm:col-span-3 text-sm text-destructive" role="alert">{error}</p>}
        </form>
      )}
    </div>
  );
}
