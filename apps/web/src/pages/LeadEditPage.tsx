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
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

type LeadSource = 'website' | 'fb_ads' | 'referral' | 'manual';
type LeadType = 'planning' | 'execution';
type LeadStatus =
  | 'new'
  | 'no_answer_1'
  | 'no_answer_2'
  | 'no_answer_3'
  | 'follow_up'
  | 'planning_meeting_scheduled'
  | 'awaiting_plans'
  | 'quote_issued'
  | 'work_meeting_scheduled'
  | 'won'
  | 'lost'
  | 'not_relevant';
type InteractionType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note';

const LEAD_SOURCES: LeadSource[] = ['website', 'fb_ads', 'referral', 'manual'];
const LEAD_TYPES: LeadType[] = ['planning', 'execution'];
const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'no_answer_1',
  'no_answer_2',
  'no_answer_3',
  'follow_up',
  'planning_meeting_scheduled',
  'awaiting_plans',
  'quote_issued',
  'work_meeting_scheduled',
  'won',
  'lost',
  'not_relevant',
];
const INTERACTION_TYPES: InteractionType[] = ['call', 'whatsapp', 'email', 'meeting', 'note'];

interface LeadForm {
  full_name: string;
  phone: string;
  email: string;
  source: LeadSource;
  type: LeadType;
  status: LeadStatus;
  estimated_value: string;
  owner_id: string;
  last_contact_at: string;
  lost_reason: string;
  notes: string;
}

interface UserOption {
  id: string;
  full_name: string;
  role: UserRole;
}

interface InteractionRow {
  id: string;
  type: InteractionType;
  note: string | null;
  occurred_at: string;
  user: { full_name: string } | null;
}

function emptyForm(ownerId: string): LeadForm {
  return {
    full_name: '',
    phone: '',
    email: '',
    source: 'manual',
    type: 'execution',
    status: 'new',
    estimated_value: '',
    owner_id: ownerId,
    last_contact_at: '',
    lost_reason: '',
    notes: '',
  };
}

function toDatetimeInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 16);
}

function fromDatetimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function LeadEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const myId = user?.id ?? '';
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;
  const isCreate = !id;

  const [form, setForm] = useState<LeadForm>(() => emptyForm(myId));
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertedProjectId, setConvertedProjectId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [usersRes, leadRes, convRes] = await Promise.all([
        isAdmin
          ? supabase
              .from('user_profiles')
              .select('id, full_name, role')
              .eq('is_active', true)
              .order('full_name')
          : Promise.resolve({ data: [], error: null }),
        isCreate
          ? Promise.resolve({ data: null, error: null })
          : supabase
              .from('leads')
              .select(
                'full_name, phone, email, source, type, status, estimated_value, owner_id, last_contact_at, lost_reason, notes',
              )
              .eq('id', id)
              .maybeSingle(),
        !isCreate
          ? supabase.from('projects').select('id').eq('created_from_lead_id', id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (usersRes.error) setError(usersRes.error.message);
      else setUsers((usersRes.data as UserOption[]) ?? []);

      if (convRes.data) setConvertedProjectId((convRes.data as { id: string }).id);

      if (!isCreate) {
        if (leadRes.error || !leadRes.data) {
          setError(leadRes.error?.message ?? t('leads.notFound'));
        } else {
          const l = leadRes.data as {
            full_name: string;
            phone: string;
            email: string | null;
            source: LeadSource;
            type: LeadType;
            status: LeadStatus;
            estimated_value: number | null;
            owner_id: string | null;
            last_contact_at: string | null;
            lost_reason: string | null;
            notes: string | null;
          };
          setForm({
            full_name: l.full_name,
            phone: l.phone,
            email: l.email ?? '',
            source: l.source,
            type: l.type,
            status: l.status,
            estimated_value: l.estimated_value != null ? String(l.estimated_value) : '',
            owner_id: l.owner_id ?? '',
            last_contact_at: toDatetimeInput(l.last_contact_at),
            lost_reason: l.lost_reason ?? '',
            notes: l.notes ?? '',
          });
        }
      } else {
        setForm(emptyForm(myId));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreate, isAdmin, myId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || null,
      source: form.source,
      type: form.type,
      status: form.status,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      owner_id: form.owner_id || null,
      last_contact_at: fromDatetimeInput(form.last_contact_at),
      lost_reason: form.status === 'lost' ? form.lost_reason || null : null,
      notes: form.notes || null,
    };
    if (isCreate) {
      const { data, error } = await supabase.from('leads').insert(payload).select('id').single();
      setSaving(false);
      if (error) setError(error.message);
      else navigate(`/leads/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from('leads').update(payload).eq('id', id);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isCreate ? t('leads.newTitle') : t('leads.editTitle')}
        </h1>
        <div className="flex items-center gap-2">
          {!isCreate && isAdmin && (
            convertedProjectId
              ? (
                <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${convertedProjectId}`)}>
                  {t('leads.viewProject')}
                </Button>
              )
              : form.status === 'won' && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/projects/new?from_lead=${id!}`)}>
                  {t('leads.convertToProject')}
                </Button>
              )
          )}
          <Button variant="ghost" onClick={() => navigate('/leads')} disabled={saving}>
            {t('common.back')}
          </Button>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base">{t('leads.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('leads.fullName')} *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('leads.phone')} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('leads.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">{t('leads.sourceLabel')} *</Label>
                <SelectField
                  id="source"
                  value={form.source}
                  onChange={(v) => setForm((f) => ({ ...f, source: v as LeadSource }))}
                  disabled={saving}
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {t(`leads.source.${s}`)}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('leads.typeLabel')} *</Label>
                <SelectField
                  id="type"
                  value={form.type}
                  onChange={(v) => setForm((f) => ({ ...f, type: v as LeadType }))}
                  disabled={saving}
                >
                  {LEAD_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {t(`leads.type.${ty}`)}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t('leads.statusLabel')} *</Label>
                <SelectField
                  id="status"
                  value={form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: v as LeadStatus }))}
                  disabled={saving}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`leads.status.${s}`)}
                    </option>
                  ))}
                </SelectField>
              </div>
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="owner_id">{t('leads.owner')}</Label>
                  <SelectField
                    id="owner_id"
                    value={form.owner_id}
                    onChange={(v) => setForm((f) => ({ ...f, owner_id: v }))}
                    disabled={saving}
                  >
                    <option value="">{t('leads.noOwner')}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} · {t(`roles.${u.role}`)}
                      </option>
                    ))}
                  </SelectField>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="estimated_value">{t('leads.estimatedValue')}</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  min="0"
                  value={form.estimated_value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimated_value: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="last_contact_at">{t('leads.lastContactAt')}</Label>
                <Input
                  id="last_contact_at"
                  type="datetime-local"
                  value={form.last_contact_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_contact_at: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
              {form.status === 'lost' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="lost_reason">{t('leads.lostReason')}</Label>
                  <Input
                    id="lost_reason"
                    value={form.lost_reason}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lost_reason: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{t('leads.notes')}</Label>
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

      {!isCreate && id && <CustomerQuotesPanel leadId={id} />}
      {!isCreate && id && <EventsPanel leadId={id} />}
      {!isCreate && id && <InteractionsPanel leadId={id} />}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
}

function SelectField({ id, value, onChange, children, required, disabled }: SelectFieldProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      {children}
    </select>
  );
}

type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';

const QUOTE_STATUSES: QuoteStatus[] = ['draft', 'sent', 'approved', 'rejected', 'cancelled'];

const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-slate-100 text-slate-700',
};

interface QuoteRow {
  id: string;
  total_amount: number | null;
  status: QuoteStatus;
  notes: string | null;
  created_at: string;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomerQuotesPanel({ leadId }: { leadId: string }) {
  const { t, i18n } = useTranslation();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ total_amount: string; status: QuoteStatus; notes: string }>({
    total_amount: '',
    status: 'draft',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const { data, error } = await supabase
      .from('customer_quotes')
      .select('id, total_amount, status, notes, created_at')
      .eq('lead_id', leadId)
      .eq('kind', 'pre_deal')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setQuotes((data as QuoteRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  function startAdd() {
    setEditingId(null);
    setForm({ total_amount: '', status: 'draft', notes: '' });
    setError(null);
    setAdding(true);
  }

  function startEdit(q: QuoteRow) {
    setAdding(false);
    setEditingId(q.id);
    setForm({
      total_amount: q.total_amount != null ? String(q.total_amount) : '',
      status: q.status,
      notes: q.notes ?? '',
    });
    setError(null);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  async function saveForm(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      total_amount: form.total_amount ? Number(form.total_amount) : null,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = adding
      ? await supabase.from('customer_quotes').insert({
          ...payload,
          lead_id: leadId,
          kind: 'pre_deal',
        })
      : await supabase.from('customer_quotes').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancelForm();
    await refresh();
  }

  async function removeQuote(q: QuoteRow) {
    if (!confirm(t('customerQuotes.confirmDelete'))) return;
    const { error } = await supabase.from('customer_quotes').delete().eq('id', q.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function renderForm() {
    return (
      <form onSubmit={saveForm} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="q_amount">{t('customerQuotes.totalAmount')}</Label>
            <Input
              id="q_amount"
              type="number"
              min="0"
              value={form.total_amount}
              onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="q_status">{t('customerQuotes.statusLabel')}</Label>
            <SelectField
              id="q_status"
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v as QuoteStatus }))}
              disabled={saving}
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`customerQuotes.status.${s}`)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="q_notes">{t('common.notes')}</Label>
            <textarea
              id="q_notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancelForm} disabled={saving}>
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
        <CardTitle className="text-base">{t('customerQuotes.title')}</CardTitle>
        {!adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('customerQuotes.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : (
          <div className="divide-y">
            {adding && renderForm()}
            {quotes.length === 0 && !adding ? (
              <p className="text-sm text-muted-foreground p-6">{t('customerQuotes.empty')}</p>
            ) : (
              quotes.map((q) =>
                editingId === q.id ? (
                  <div key={q.id}>{renderForm()}</div>
                ) : (
                  <div key={q.id} className="px-6 py-3 flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{formatCurrency(q.total_amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {dateFormat.format(new Date(q.created_at))}
                      </div>
                      {q.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">
                          {q.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${QUOTE_STATUS_COLORS[q.status]}`}
                    >
                      {t(`customerQuotes.status.${q.status}`)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(q)}>
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void removeQuote(q)}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
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

type EventStatus = 'scheduled' | 'cancelled' | 'no_show';

const EVENT_STATUSES: EventStatus[] = ['scheduled', 'cancelled', 'no_show'];

interface EventRow {
  id: string;
  title: string;
  status: EventStatus;
  scheduled_at: string;
  duration_minutes: number | null;
  notes: string | null;
}

const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-amber-100 text-amber-800',
};

function EventsPanel({ leadId }: { leadId: string }) {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [evNotes, setEvNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, status, scheduled_at, duration_minutes, notes')
      .eq('lead_id', leadId)
      .order('scheduled_at');
    if (error) setError(error.message);
    else setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  function startAdd() {
    setAdding(true);
    setTitle('');
    setScheduledAt(toDatetimeInput(new Date().toISOString()));
    setDurationMin('60');
    setEvNotes('');
    setError(null);
  }

  function cancelAdd() {
    setAdding(false);
    setError(null);
  }

  async function addEvent(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('events').insert({
      lead_id: leadId,
      title,
      scheduled_at: fromDatetimeInput(scheduledAt),
      duration_minutes: durationMin ? Number(durationMin) : 60,
      notes: evNotes || null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancelAdd();
    await refresh();
  }

  async function updateEventStatus(eventId: string, status: EventStatus) {
    const { error } = await supabase.from('events').update({ status }).eq('id', eventId);
    if (error) setError(error.message);
    else await refresh();
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t('events.title')}</CardTitle>
        {!adding && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('events.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : (
          <div className="divide-y">
            {adding && (
              <form onSubmit={addEvent} className="px-6 py-4 space-y-3 bg-muted/40">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="ev_title">{t('events.titleLabel')} *</Label>
                    <Input
                      id="ev_title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ev_at">{t('events.scheduledAt')} *</Label>
                    <Input
                      id="ev_at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ev_dur">{t('events.duration')}</Label>
                    <Input
                      id="ev_dur"
                      type="number"
                      min="1"
                      value={durationMin}
                      onChange={(e) => setDurationMin(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="ev_notes">{t('common.notes')}</Label>
                    <textarea
                      id="ev_notes"
                      value={evNotes}
                      onChange={(e) => setEvNotes(e.target.value)}
                      rows={2}
                      disabled={saving}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelAdd} disabled={saving}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? t('common.saving') : t('common.add')}
                  </Button>
                </div>
              </form>
            )}
            {events.length === 0 && !adding ? (
              <p className="text-sm text-muted-foreground p-6">{t('events.empty')}</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="px-6 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-medium text-sm truncate">{ev.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {dateFormat.format(new Date(ev.scheduled_at))}
                        {ev.duration_minutes && <span> · {ev.duration_minutes} min</span>}
                      </div>
                      {ev.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{ev.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_STATUS_COLORS[ev.status]}`}>
                        {t(`events.status.${ev.status}`)}
                      </span>
                      {ev.status === 'scheduled' && (
                        <SelectField
                          id={`ev_status_${ev.id}`}
                          value=""
                          onChange={(v) => void updateEventStatus(ev.id, v as EventStatus)}
                        >
                          <option value="" disabled>···</option>
                          <option value="cancelled">{t('events.status.cancelled')}</option>
                          <option value="no_show">{t('events.status.no_show')}</option>
                        </SelectField>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InteractionsPanel({ leadId }: { leadId: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<InteractionType>('call');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeInput(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from('interactions')
      .select('id, type, note, occurred_at, user:user_profiles(full_name)')
      .eq('lead_id', leadId)
      .order('occurred_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setInteractions((data as unknown as InteractionRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  function startAdd() {
    setAdding(true);
    setType('call');
    setNote('');
    setOccurredAt(toDatetimeInput(new Date().toISOString()));
    setError(null);
  }

  function cancelAdd() {
    setAdding(false);
    setError(null);
  }

  async function addInteraction(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('interactions').insert({
      lead_id: leadId,
      type,
      note: note || null,
      user_id: user.id,
      occurred_at: fromDatetimeInput(occurredAt),
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    cancelAdd();
    await refresh();
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t('interactions.title')}</CardTitle>
        {!adding && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('interactions.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : (
          <div className="divide-y">
            {adding && (
              <form onSubmit={addInteraction} className="px-6 py-4 space-y-3 bg-muted/40">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="int_type">{t('interactions.typeLabel')}</Label>
                    <SelectField
                      id="int_type"
                      value={type}
                      onChange={(v) => setType(v as InteractionType)}
                      disabled={saving}
                    >
                      {INTERACTION_TYPES.map((t2) => (
                        <option key={t2} value={t2}>
                          {t(`interactions.type.${t2}`)}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="int_at">{t('interactions.occurredAt')}</Label>
                    <Input
                      id="int_at"
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(e) => setOccurredAt(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="int_note">{t('interactions.note')}</Label>
                    <textarea
                      id="int_note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelAdd}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? t('common.saving') : t('common.add')}
                  </Button>
                </div>
              </form>
            )}
            {interactions.length === 0 && !adding ? (
              <p className="text-sm text-muted-foreground p-6">{t('interactions.empty')}</p>
            ) : (
              interactions.map((int) => (
                <div key={int.id} className="px-6 py-3 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {t(`interactions.type.${int.type}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dateFormat.format(new Date(int.occurred_at))}
                      {int.user && <span> · {int.user.full_name}</span>}
                    </span>
                  </div>
                  {int.note && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {int.note}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
