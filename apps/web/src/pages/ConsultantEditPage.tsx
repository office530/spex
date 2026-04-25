import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@spex/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface ConsultantForm {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyForm: ConsultantForm = {
  name: '',
  specialty: '',
  phone: '',
  email: '',
  notes: '',
};

export function ConsultantEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreate = !id;

  const [form, setForm] = useState<ConsultantForm>(emptyForm);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreate) return;
    void (async () => {
      const { data, error: dbErr } = await supabase
        .from('consultants')
        .select('name, specialty, phone, email, notes')
        .eq('id', id)
        .maybeSingle();
      if (dbErr || !data) {
        setError(dbErr?.message ?? t('consultants.notFound'));
      } else {
        const c = data as {
          name: string;
          specialty: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
        };
        setForm({
          name: c.name,
          specialty: c.specialty ?? '',
          phone: c.phone ?? '',
          email: c.email ?? '',
          notes: c.notes ?? '',
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
      specialty: form.specialty || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
    };
    if (isCreate) {
      const { data, error: dbErr } = await supabase
        .from('consultants')
        .insert(payload)
        .select('id')
        .single();
      setSaving(false);
      if (dbErr) {
        setError(dbErr.message);
        toast.error(t('common.errorToast'), { description: dbErr.message });
      } else {
        toast.success(t('common.createdToast'));
        await queryClient.invalidateQueries({ queryKey: ['consultants'] });
        navigate(`/consultants/${data.id}`, { replace: true });
      }
    } else {
      const { error: dbErr } = await supabase.from('consultants').update(payload).eq('id', id);
      setSaving(false);
      if (dbErr) {
        setError(dbErr.message);
        toast.error(t('common.errorToast'), { description: dbErr.message });
      } else {
        toast.success(t('common.savedToast'));
        await queryClient.invalidateQueries({ queryKey: ['consultants'] });
      }
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
          <h1 className="text-2xl font-bold">{t('consultants.newTitle')}</h1>
          <Button variant="ghost" onClick={() => navigate('/consultants')} disabled={saving}>
            {t('common.back')}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-mesh-hero text-primary-foreground p-6 sm:p-8 shadow-md">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 min-w-0">
              <div className="text-xs font-medium text-primary-foreground/70">
                {t('consultants.title')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {form.name || t('consultants.editTitle')}
              </h1>
              <div className="flex items-center gap-3 text-sm text-primary-foreground/80 flex-wrap">
                {form.specialty && <span>{form.specialty}</span>}
                {form.phone && <span>· {form.phone}</span>}
                {form.email && <span className="hidden sm:inline">· {form.email}</span>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground shrink-0"
              onClick={() => navigate('/consultants')}
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
              <CardTitle className="text-base">{t('consultants.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">{t('consultants.name')} *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="specialty">{t('consultants.specialty')}</Label>
                  <Input
                    id="specialty"
                    value={form.specialty}
                    onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('consultants.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('consultants.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">{t('consultants.notes')}</Label>
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
