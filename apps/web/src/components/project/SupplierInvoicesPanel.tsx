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
import { formatCurrencyILS } from './format';

type InvoiceStatus = 'received' | 'matched' | 'disputed' | 'processed';

const STATUSES: InvoiceStatus[] = ['received', 'matched', 'disputed', 'processed'];

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  matched: 'bg-violet-100 text-violet-800',
  disputed: 'bg-rose-100 text-rose-800',
  processed: 'bg-emerald-100 text-emerald-800',
};

interface SupplierOption {
  id: string;
  name: string;
}

interface InvoiceRow {
  id: string;
  supplier_id: string;
  amount: number;
  invoice_number: string | null;
  invoice_date: string | null;
  file_url: string | null;
  status: InvoiceStatus;
  notes: string | null;
  supplier: { name: string } | null;
}

function toDateInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function fromDateInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function SupplierInvoicesPanel({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    supplier_id: '',
    amount: '',
    invoice_number: '',
    invoice_date: '',
    file_url: '',
    status: 'received' as InvoiceStatus,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [iRes, sRes] = await Promise.all([
      supabase
        .from('supplier_invoices')
        .select(
          'id, supplier_id, amount, invoice_number, invoice_date, file_url, status, notes, supplier:suppliers(name)',
        )
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false, nullsFirst: false }),
      canWrite && suppliers.length === 0
        ? supabase.from('suppliers').select('id, name').eq('status', 'active').order('name')
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (iRes.error) setError(iRes.error.message);
    else setRows((iRes.data as unknown as InvoiceRow[]) ?? []);
    if (sRes.data) setSuppliers(sRes.data as SupplierOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setEditingId(null);
    setForm({
      supplier_id: suppliers[0]?.id ?? '',
      amount: '',
      invoice_number: '',
      invoice_date: toDateInput(new Date().toISOString()),
      file_url: '',
      status: 'received',
      notes: '',
    });
    setError(null);
    setAdding(true);
  }

  function startEdit(r: InvoiceRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      supplier_id: r.supplier_id,
      amount: String(r.amount),
      invoice_number: r.invoice_number ?? '',
      invoice_date: toDateInput(r.invoice_date),
      file_url: r.file_url ?? '',
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

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.supplier_id || !form.amount) return;
    setSaving(true);
    setError(null);
    const payload = {
      supplier_id: form.supplier_id,
      amount: Number(form.amount),
      invoice_number: form.invoice_number || null,
      invoice_date: fromDateInput(form.invoice_date),
      file_url: form.file_url || null,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = adding
      ? await supabase
          .from('supplier_invoices')
          .insert({ ...payload, project_id: projectId })
      : await supabase.from('supplier_invoices').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancel();
    await refresh();
  }

  async function remove(r: InvoiceRow) {
    if (!confirm(t('supplierInvoices.confirmDelete'))) return;
    const { error } = await supabase.from('supplier_invoices').delete().eq('id', r.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="si_supplier">{t('supplierInvoices.supplier')} *</Label>
            <select
              id="si_supplier"
              value={form.supplier_id}
              onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
              required
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('supplierInvoices.selectSupplier')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="si_amount">{t('supplierInvoices.amount')} *</Label>
            <Input
              id="si_amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="si_number">{t('supplierInvoices.invoiceNumber')}</Label>
            <Input
              id="si_number"
              value={form.invoice_number}
              onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="si_date">{t('supplierInvoices.invoiceDate')}</Label>
            <Input
              id="si_date"
              type="date"
              value={form.invoice_date}
              onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="si_status">{t('supplierInvoices.statusLabel')}</Label>
            <select
              id="si_status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InvoiceStatus }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`supplierInvoices.status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="si_file">{t('supplierInvoices.fileUrl')}</Label>
            <Input
              id="si_file"
              type="url"
              value={form.file_url}
              onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="si_notes">{t('common.notes')}</Label>
            <textarea
              id="si_notes"
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
          <Button type="submit" size="sm" disabled={saving || !form.supplier_id || !form.amount}>
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
          {t('supplierInvoices.title')}
          {rows.length > 0 && (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              ({formatCurrencyILS(total)})
            </span>
          )}
        </CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('supplierInvoices.add')}
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
              <p className="text-sm text-muted-foreground p-6">{t('supplierInvoices.empty')}</p>
            ) : (
              rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">
                        {r.supplier?.name ?? '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.invoice_number && <span>#{r.invoice_number}</span>}
                        {r.invoice_date && (
                          <span>
                            {r.invoice_number ? ' · ' : ''}
                            {dateFmt.format(new Date(r.invoice_date))}
                          </span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">
                          {r.notes}
                        </p>
                      )}
                      {r.file_url && (
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 hover:underline mt-1 inline-block"
                        >
                          {t('supplierInvoices.fileUrl')}
                        </a>
                      )}
                    </div>
                    <div className="shrink-0 text-sm font-medium">
                      {formatCurrencyILS(r.amount)}
                    </div>
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}
                    >
                      {t(`supplierInvoices.status.${r.status}`)}
                    </span>
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
