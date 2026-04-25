import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  StatusBadge,
} from '@spex/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type SupplierStatus = 'pending_approval' | 'active' | 'blocked';

const STATUSES: SupplierStatus[] = ['pending_approval', 'active', 'blocked'];

interface SupplierForm {
  name: string;
  category: string;
  phone: string;
  email: string;
  tax_id: string;
  status: SupplierStatus;
  notes: string;
}

const emptyForm: SupplierForm = {
  name: '',
  category: '',
  phone: '',
  email: '',
  tax_id: '',
  status: 'pending_approval',
  notes: '',
};

export function SupplierEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = !id;

  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreate) return;
    void (async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('name, category, phone, email, tax_id, status, notes')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        setError(error?.message ?? t('suppliers.notFound'));
      } else {
        const s = data as {
          name: string;
          category: string | null;
          phone: string | null;
          email: string | null;
          tax_id: string | null;
          status: SupplierStatus;
          notes: string | null;
        };
        setForm({
          name: s.name,
          category: s.category ?? '',
          phone: s.phone ?? '',
          email: s.email ?? '',
          tax_id: s.tax_id ?? '',
          status: s.status,
          notes: s.notes ?? '',
        });
      }
      setLoading(false);
    })();
  }, [id, isCreate, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      category: form.category || null,
      phone: form.phone || null,
      email: form.email || null,
      tax_id: form.tax_id || null,
      status: form.status,
      notes: form.notes || null,
    };
    if (isCreate) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(payload)
        .select('id')
        .single();
      setSaving(false);
      if (error) setError(error.message);
      else navigate(`/suppliers/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
      setSaving(false);
      if (error) setError(error.message);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
    );
  }

  return (
    <div className={`${isCreate ? 'max-w-3xl mx-auto' : ''} space-y-6`}>
      {isCreate ? (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('suppliers.newTitle')}</h1>
          <Button variant="ghost" onClick={() => navigate('/suppliers')} disabled={saving}>
            {t('common.back')}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-mesh-hero text-primary-foreground p-6 sm:p-8 shadow-md">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 min-w-0">
              <div className="text-xs font-medium text-primary-foreground/70">
                {t('suppliers.title')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {form.name || t('suppliers.editTitle')}
              </h1>
              <div className="flex items-center gap-3 text-sm text-primary-foreground/80 flex-wrap">
                {form.category && <span>{form.category}</span>}
                {form.phone && <span>· {form.phone}</span>}
                {form.tax_id && <span>· {form.tax_id}</span>}
                <StatusBadge
                  family="supplier"
                  value={form.status}
                  label={t(`suppliers.status.${form.status}`)}
                  className="bg-white/15 text-white"
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground shrink-0"
              onClick={() => navigate('/suppliers')}
              disabled={saving}
            >
              {t('common.back')}
            </Button>
          </div>
        </div>
      )}

      <div className={isCreate ? '' : 'max-w-3xl mx-auto space-y-6'}>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base">{t('suppliers.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">{t('suppliers.name')} *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t('suppliers.category')}</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t('suppliers.statusLabel')}</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SupplierStatus }))}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`suppliers.status.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('suppliers.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('suppliers.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tax_id">{t('suppliers.taxId')}</Label>
                <Input
                  id="tax_id"
                  value={form.tax_id}
                  onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{t('suppliers.notes')}</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  disabled={saving}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </div>
  );
}
