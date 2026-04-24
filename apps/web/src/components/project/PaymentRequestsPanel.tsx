import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatCurrencyILS,
  Input,
  Label,
  StatusBadge,
} from '@spex/ui';
import { Wallet } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

type PrStatus =
  | 'awaiting_payment_request'
  | 'awaiting_pm_approval'
  | 'pm_approved_awaiting_back_office'
  | 'paid'
  | 'rejected';

const STATUSES: PrStatus[] = [
  'awaiting_payment_request',
  'awaiting_pm_approval',
  'pm_approved_awaiting_back_office',
  'paid',
  'rejected',
];

interface InvoiceOption {
  id: string;
  amount: number;
  invoice_number: string | null;
  supplier: { name: string } | null;
}

interface PrRow {
  id: string;
  supplier_invoice_id: string | null;
  amount: number;
  status: PrStatus;
  paid_at: string | null;
  notes: string | null;
  invoice: {
    invoice_number: string | null;
    supplier: { name: string } | null;
  } | null;
}

export function PaymentRequestsPanel({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<PrRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    supplier_invoice_id: '',
    amount: '',
    status: 'awaiting_pm_approval' as PrStatus,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [prRes, invRes] = await Promise.all([
      supabase
        .from('payment_requests')
        .select(
          'id, supplier_invoice_id, amount, status, paid_at, notes, invoice:supplier_invoices(invoice_number, supplier:suppliers(name))',
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      canWrite && invoices.length === 0
        ? supabase
            .from('supplier_invoices')
            .select('id, amount, invoice_number, supplier:suppliers(name)')
            .eq('project_id', projectId)
            .order('invoice_date', { ascending: false, nullsFirst: false })
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (prRes.error) setError(prRes.error.message);
    else setRows((prRes.data as unknown as PrRow[]) ?? []);
    if (invRes.data) setInvoices(invRes.data as unknown as InvoiceOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setEditingId(null);
    setForm({
      supplier_invoice_id: '',
      amount: '',
      status: 'awaiting_pm_approval',
      notes: '',
    });
    setError(null);
    setAdding(true);
  }

  function startEdit(r: PrRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      supplier_invoice_id: r.supplier_invoice_id ?? '',
      amount: String(r.amount),
      status: r.status,
      notes: r.notes ?? '',
    });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function onInvoiceChange(invoiceId: string) {
    const inv = invoices.find((i) => i.id === invoiceId);
    setForm((f) => ({
      ...f,
      supplier_invoice_id: invoiceId,
      amount: inv && !f.amount ? String(inv.amount) : f.amount,
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    setError(null);
    const current = rows.find((r) => r.id === editingId);
    const transitioningToPaid = form.status === 'paid' && current?.status !== 'paid';
    const payload: Record<string, unknown> = {
      supplier_invoice_id: form.supplier_invoice_id || null,
      amount: Number(form.amount),
      status: form.status,
      notes: form.notes || null,
    };
    if (transitioningToPaid) payload.paid_at = new Date().toISOString();
    else if (form.status !== 'paid') payload.paid_at = null;
    const { error } = adding
      ? await supabase
          .from('payment_requests')
          .insert({ ...payload, project_id: projectId })
      : await supabase.from('payment_requests').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancel();
    await refresh();
  }

  async function remove(r: PrRow) {
    if (!confirm(t('paymentRequests.confirmDelete'))) return;
    const { error } = await supabase.from('payment_requests').delete().eq('id', r.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function invoiceLabel(inv: InvoiceOption | PrRow['invoice']): string {
    if (!inv) return '—';
    const supplierName = inv.supplier?.name ?? '—';
    const num = inv.invoice_number ? `#${inv.invoice_number}` : '';
    return `${supplierName}${num ? ' ' + num : ''}`;
  }

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="pr_invoice">{t('paymentRequests.linkedInvoice')}</Label>
            <select
              id="pr_invoice"
              value={form.supplier_invoice_id}
              onChange={(e) => onInvoiceChange(e.target.value)}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('paymentRequests.noInvoice')}</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {invoiceLabel(i)} · {formatCurrencyILS(i.amount)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr_amount">{t('paymentRequests.amount')} *</Label>
            <Input
              id="pr_amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr_status">{t('paymentRequests.statusLabel')}</Label>
            <select
              id="pr_status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PrStatus }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`paymentRequests.status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="pr_notes">{t('common.notes')}</Label>
            <textarea
              id="pr_notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
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
          {t('paymentRequests.title')}
          {rows.length > 0 && (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              ({formatCurrencyILS(total)})
            </span>
          )}
        </CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('paymentRequests.add')}
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
                icon={Wallet}
                title={t('paymentRequests.empty')}
                cta={canWrite ? { label: t('paymentRequests.add'), onClick: startAdd } : undefined}
              />
            ) : (
              rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{invoiceLabel(r.invoice)}</div>
                      {r.paid_at && (
                        <div className="text-xs text-emerald-700">
                          {t('paymentRequests.paidAt', {
                            date: dateFmt.format(new Date(r.paid_at)),
                          })}
                        </div>
                      )}
                      {r.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">
                          {r.notes}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-sm font-medium">
                      {formatCurrencyILS(r.amount)}
                    </div>
                    <StatusBadge
                      family="payment_request"
                      value={r.status}
                      label={t(`paymentRequests.status.${r.status}`)}
                      className="shrink-0"
                    />
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
                ),
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
