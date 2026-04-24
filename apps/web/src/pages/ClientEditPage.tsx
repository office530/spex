import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from '@spex/ui';
import { UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ClientForm {
  company_name: string;
  primary_contact_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface ContactRow {
  id: string;
  full_name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
}

const emptyForm: ClientForm = {
  company_name: '',
  primary_contact_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export function ClientEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = !id;

  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreate) return;
    void (async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('company_name, primary_contact_name, phone, email, address, notes')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        setError(error?.message ?? t('clients.notFound'));
      } else {
        setForm({
          company_name: data.company_name ?? '',
          primary_contact_name: data.primary_contact_name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          notes: data.notes ?? '',
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
      company_name: form.company_name,
      primary_contact_name: form.primary_contact_name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    };
    if (isCreate) {
      const { data, error } = await supabase
        .from('clients')
        .insert(payload)
        .select('id')
        .single();
      setSaving(false);
      if (error) {
        setError(error.message);
      } else {
        navigate(`/clients/${data.id}`, { replace: true });
      }
    } else {
      const { error } = await supabase.from('clients').update(payload).eq('id', id);
      setSaving(false);
      if (error) setError(error.message);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
    );
  }

  function field<K extends keyof ClientForm>(key: K) {
    return {
      id: key,
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
      disabled: saving,
    };
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isCreate ? t('clients.newTitle') : t('clients.editTitle')}
        </h1>
        <Button variant="ghost" onClick={() => navigate('/clients')} disabled={saving}>
          {t('common.back')}
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base">{t('clients.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">{t('clients.companyName')} *</Label>
                <Input {...field('company_name')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_contact_name">{t('clients.primaryContactName')} *</Label>
                <Input {...field('primary_contact_name')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('clients.phone')}</Label>
                <Input {...field('phone')} type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('clients.email')}</Label>
                <Input {...field('email')} type="email" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">{t('clients.address')}</Label>
                <Input {...field('address')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{t('clients.notes')}</Label>
                <textarea
                  {...field('notes')}
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

      {!isCreate && id && <ContactsPanel clientId={id} />}
    </div>
  );
}

interface ContactFormState {
  full_name: string;
  role: string;
  phone: string;
  email: string;
}

const emptyContact: ContactFormState = { full_name: '', role: '', phone: '', email: '' };

function ContactsPanel({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ContactFormState>(emptyContact);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, full_name, role, phone, email')
      .eq('client_id', clientId)
      .order('full_name');
    if (error) {
      setError(error.message);
    } else {
      setContacts((data as ContactRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  function startEdit(c: ContactRow) {
    setAdding(false);
    setEditingId(c.id);
    setForm({
      full_name: c.full_name,
      role: c.role ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    });
  }

  function startAdd() {
    setEditingId(null);
    setAdding(true);
    setForm(emptyContact);
  }

  function cancelForm() {
    setEditingId(null);
    setAdding(false);
    setForm(emptyContact);
    setError(null);
  }

  async function saveContact(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      client_id: clientId,
      full_name: form.full_name,
      role: form.role || null,
      phone: form.phone || null,
      email: form.email || null,
    };
    const { error } = adding
      ? await supabase.from('contacts').insert(payload)
      : await supabase.from('contacts').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    cancelForm();
    await refresh();
  }

  async function deleteContact(c: ContactRow) {
    if (!confirm(t('contacts.confirmDelete'))) return;
    const { error } = await supabase.from('contacts').delete().eq('id', c.id);
    if (error) {
      setError(error.message);
      return;
    }
    await refresh();
  }

  const isFormOpen = adding || editingId !== null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t('contacts.title')}</CardTitle>
        {!isFormOpen && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('contacts.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : contacts.length === 0 && !isFormOpen ? (
          <EmptyState
            icon={UserRound}
            title={t('contacts.empty')}
            cta={{ label: t('contacts.add'), onClick: startAdd }}
          />
        ) : (
          <div className="divide-y">
            {contacts.map((c) =>
              editingId === c.id ? (
                <ContactForm
                  key={c.id}
                  form={form}
                  setForm={setForm}
                  onSubmit={saveContact}
                  onCancel={cancelForm}
                  saving={saving}
                  error={error}
                />
              ) : (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-6 py-3 gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.role && <span>{c.role}</span>}
                      {c.role && (c.phone || c.email) && <span> · </span>}
                      {c.phone && <span>{c.phone}</span>}
                      {c.phone && c.email && <span> · </span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void deleteContact(c)}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              ),
            )}
            {adding && (
              <ContactForm
                form={form}
                setForm={setForm}
                onSubmit={saveContact}
                onCancel={cancelForm}
                saving={saving}
                error={error}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ContactFormProps {
  form: ContactFormState;
  setForm: (updater: (f: ContactFormState) => ContactFormState) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function ContactForm({ form, setForm, onSubmit, onCancel, saving, error }: ContactFormProps) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} className="px-6 py-4 space-y-3 bg-muted/40">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="contact_full_name">{t('contacts.fullName')} *</Label>
          <Input
            id="contact_full_name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contact_role">{t('contacts.role')}</Label>
          <Input
            id="contact_role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contact_phone">{t('contacts.phone')}</Label>
          <Input
            id="contact_phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contact_email">{t('contacts.email')}</Label>
          <Input
            id="contact_email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={saving}
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  );
}
