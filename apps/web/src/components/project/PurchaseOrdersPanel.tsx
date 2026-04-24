import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatCurrencyILS,
  fromDateInput,
  Input,
  Label,
  StatusBadge,
  toDateInput,
} from '@spex/ui';
import { Send, Truck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { enqueueChashbashvatSync, type SyncStatus } from '../../lib/chashbashvat';
import { supabase } from '../../lib/supabase';

type PoStatus =
  | 'draft'
  | 'issued'
  | 'partially_received'
  | 'received'
  | 'cancelled';

const STATUSES: PoStatus[] = ['draft', 'issued', 'partially_received', 'received', 'cancelled'];

interface SupplierOption {
  id: string;
  name: string;
}

interface PoRow {
  id: string;
  supplier_id: string;
  status: PoStatus;
  total_amount: number | null;
  issued_at: string | null;
  notes: string | null;
  chashbashvat_sync_status: SyncStatus | null;
  supplier: { name: string } | null;
}

interface PoForm {
  supplier_id: string;
  status: PoStatus;
  total_amount: string;
  issued_at: string;
  notes: string;
}

const EMPTY_FORM: PoForm = {
  supplier_id: '',
  status: 'draft',
  total_amount: '',
  issued_at: '',
  notes: '',
};

export function PurchaseOrdersPanel({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<PoRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [poRes, sRes] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select(
          'id, supplier_id, status, total_amount, issued_at, notes, chashbashvat_sync_status, supplier:suppliers(name)',
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      canWrite && suppliers.length === 0
        ? supabase.from('suppliers').select('id, name').eq('status', 'active').order('name')
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (poRes.error) setError(poRes.error.message);
    else setRows((poRes.data as unknown as PoRow[]) ?? []);
    if (sRes.data) setSuppliers(sRes.data as SupplierOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, supplier_id: suppliers[0]?.id ?? '' });
    setError(null);
    setAdding(true);
  }

  function startEdit(r: PoRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      supplier_id: r.supplier_id,
      status: r.status,
      total_amount: r.total_amount != null ? String(r.total_amount) : '',
      issued_at: toDateInput(r.issued_at),
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
    if (!form.supplier_id) return;
    setSaving(true);
    setError(null);
    const payload = {
      supplier_id: form.supplier_id,
      status: form.status,
      total_amount: form.total_amount ? Number(form.total_amount) : null,
      issued_at: fromDateInput(form.issued_at),
      notes: form.notes || null,
    };
    const { error: dbErr } = adding
      ? await supabase
          .from('purchase_orders')
          .insert({ ...payload, project_id: projectId })
      : await supabase.from('purchase_orders').update(payload).eq('id', editingId!);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    cancel();
    await refresh();
  }

  async function remove(r: PoRow) {
    if (!confirm(t('purchaseOrders.confirmDelete'))) return;
    const { error: dbErr } = await supabase.from('purchase_orders').delete().eq('id', r.id);
    if (dbErr) setError(dbErr.message);
    else await refresh();
  }

  async function queueSync(r: PoRow) {
    try {
      await enqueueChashbashvatSync({
        entityType: 'purchase_order',
        entityId: r.id,
        operation: r.chashbashvat_sync_status ? 'update' : 'create',
        payload: {
          total_amount: r.total_amount ?? 0,
          issued_at: r.issued_at,
          notes: r.notes ?? null,
        },
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'sync enqueue failed');
    }
  }

  const total = rows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="po_supplier">{t('purchaseOrders.supplier')} *</Label>
            <select
              id="po_supplier"
              value={form.supplier_id}
              onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
              required
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('purchaseOrders.selectSupplier')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="po_amount">{t('purchaseOrders.totalAmount')}</Label>
            <Input
              id="po_amount"
              type="number"
              min="0"
              value={form.total_amount}
              onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="po_status">{t('purchaseOrders.statusLabel')}</Label>
            <select
              id="po_status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PoStatus }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`purchaseOrders.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="po_issued">{t('purchaseOrders.issuedAt')}</Label>
            <Input
              id="po_issued"
              type="date"
              value={form.issued_at}
              onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="po_notes">{t('common.notes')}</Label>
            <textarea
              id="po_notes"
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
          <Button type="submit" size="sm" disabled={saving || !form.supplier_id}>
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
          {t('purchaseOrders.title')}
          {rows.length > 0 && (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              ({formatCurrencyILS(total)})
            </span>
          )}
        </CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('purchaseOrders.add')}
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
                icon={Truck}
                title={t('purchaseOrders.empty')}
                cta={canWrite ? { label: t('purchaseOrders.add'), onClick: startAdd } : undefined}
              />
            ) : (
              rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{r.supplier?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.issued_at && (
                          <span>
                            {t('purchaseOrders.issuedAt')}: {dateFmt.format(new Date(r.issued_at))}
                          </span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">
                          {r.notes}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-sm font-medium">
                      {formatCurrencyILS(r.total_amount)}
                    </div>
                    <StatusBadge
                      family="purchase_order"
                      value={r.status}
                      label={t(`purchaseOrders.status.${r.status}`)}
                      className="shrink-0"
                    />
                    {r.chashbashvat_sync_status && (
                      <StatusBadge
                        family="chashbashvat_sync"
                        value={r.chashbashvat_sync_status}
                        label={`${t('chashbashvat.label')} · ${t(`chashbashvat.status.${r.chashbashvat_sync_status}`)}`}
                        className="shrink-0"
                      />
                    )}
                    {canWrite && (
                      <div className="shrink-0 flex items-center gap-1">
                        {r.status === 'issued' && r.chashbashvat_sync_status !== 'synced' && (
                          <Button size="sm" variant="ghost" onClick={() => void queueSync(r)}>
                            <Send className="h-3.5 w-3.5 me-1" />
                            {t('chashbashvat.queueSync')}
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
                ),
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
