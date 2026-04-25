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
import { Image as ImageIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface TicketAttachment {
  path: string;
  name: string;
  size: number;
  mime: string;
}

type TicketStatus =
  | 'new'
  | 'in_progress'
  | 'awaiting_manager'
  | 'resolved'
  | 'cancelled';
type OpenerType = 'client' | 'manager' | 'anonymous';

const STATUSES: TicketStatus[] = [
  'new',
  'in_progress',
  'awaiting_manager',
  'resolved',
  'cancelled',
];
const OPENER_TYPES: OpenerType[] = ['client', 'manager', 'anonymous'];

interface TicketForm {
  subject: string;
  body: string;
  opener_type: OpenerType;
  opener_name: string;
  opener_contact: string;
  status: TicketStatus;
  project_id: string;
  assigned_to_id: string;
}

const emptyForm: TicketForm = {
  subject: '',
  body: '',
  opener_type: 'manager',
  opener_name: '',
  opener_contact: '',
  status: 'new',
  project_id: '',
  assigned_to_id: '',
};

interface ProjectOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  full_name: string;
}

export function TicketEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = !id;

  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [projRes, userRes, ticketRes] = await Promise.all([
        supabase.from('projects').select('id, name').order('name'),
        supabase
          .from('user_profiles')
          .select('id, full_name')
          .eq('is_active', true)
          .order('full_name'),
        isCreate
          ? Promise.resolve({ data: null, error: null })
          : supabase
              .from('tickets')
              .select(
                'subject, body, opener_type, opener_name, opener_contact, status, project_id, assigned_to_id, attachments',
              )
              .eq('id', id)
              .maybeSingle(),
      ]);
      if (cancelled) return;
      if (projRes.data) setProjects(projRes.data as ProjectOption[]);
      if (userRes.data) setUsers(userRes.data as UserOption[]);
      if (!isCreate) {
        if (ticketRes.error || !ticketRes.data) {
          setError(ticketRes.error?.message ?? t('tickets.notFound'));
        } else {
          const tk = ticketRes.data as {
            subject: string;
            body: string;
            opener_type: OpenerType;
            opener_name: string | null;
            opener_contact: string | null;
            status: TicketStatus;
            project_id: string | null;
            assigned_to_id: string | null;
            attachments: TicketAttachment[] | null;
          };
          setForm({
            subject: tk.subject,
            body: tk.body,
            opener_type: tk.opener_type,
            opener_name: tk.opener_name ?? '',
            opener_contact: tk.opener_contact ?? '',
            status: tk.status,
            project_id: tk.project_id ?? '',
            assigned_to_id: tk.assigned_to_id ?? '',
          });
          if (Array.isArray(tk.attachments)) setAttachments(tk.attachments);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isCreate, t]);

  useEffect(() => {
    if (attachments.length === 0) return;
    let cancelled = false;
    void (async () => {
      const paths = attachments.map((a) => a.path);
      const { data } = await supabase.storage
        .from('ticket-uploads')
        .createSignedUrls(paths, 3600);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      data.forEach((row, idx) => {
        const path = paths[idx];
        if (path && row.signedUrl) map[path] = row.signedUrl;
      });
      setSignedUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      subject: form.subject,
      body: form.body,
      opener_type: form.opener_type,
      opener_name: form.opener_name || null,
      opener_contact: form.opener_contact || null,
      status: form.status,
      project_id: form.project_id || null,
      assigned_to_id: form.assigned_to_id || null,
    };
    if (isCreate) {
      const { data, error } = await supabase.from('tickets').insert(payload).select('id').single();
      setSaving(false);
      if (error) setError(error.message);
      else navigate(`/tickets/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from('tickets').update(payload).eq('id', id);
      setSaving(false);
      if (error) setError(error.message);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>;
  }

  return (
    <div className={`${isCreate ? 'max-w-3xl mx-auto' : ''} space-y-6`}>
      {isCreate ? (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('tickets.newTitle')}</h1>
          <Button variant="ghost" onClick={() => navigate('/tickets')} disabled={saving}>
            {t('common.back')}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-mesh-hero text-primary-foreground p-6 sm:p-8 shadow-md">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 min-w-0">
              <div className="text-xs font-medium text-primary-foreground/70">
                {t('tickets.title')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {form.subject || t('tickets.editTitle')}
              </h1>
              <div className="flex items-center gap-3 text-sm text-primary-foreground/80 flex-wrap">
                <span>{t(`tickets.opener.${form.opener_type}`)}</span>
                {form.opener_name && <span>· {form.opener_name}</span>}
                <StatusBadge
                  family="ticket"
                  value={form.status}
                  label={t(`tickets.status.${form.status}`)}
                  className="bg-white/15 text-white"
                />
                {attachments.length > 0 && (
                  <span>
                    ·{' '}
                    {t('tickets.attachmentsCount', {
                      count: attachments.length,
                    })}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground shrink-0"
              onClick={() => navigate('/tickets')}
              disabled={saving}
            >
              {t('common.back')}
            </Button>
          </div>
        </div>
      )}

      <div className={isCreate ? '' : 'max-w-3xl mx-auto space-y-6'}>
        {!isCreate && attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('tickets.attachmentsLabel')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {attachments.map((a) => {
                  const url = signedUrls[a.path];
                  const isImage = a.mime?.startsWith('image/');
                  return (
                    <a
                      key={a.path}
                      href={url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md overflow-hidden border bg-muted hover:opacity-90 transition-opacity"
                      title={a.name}
                    >
                      {isImage && url ? (
                        <img
                          src={url}
                          alt={a.name}
                          className="aspect-square object-cover w-full"
                        />
                      ) : (
                        <div className="aspect-square flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-base">{t('tickets.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="subject">{t('tickets.subject')} *</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="body">{t('tickets.body')} *</Label>
                  <textarea
                    id="body"
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    required
                    rows={4}
                    disabled={saving}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opener_type">{t('tickets.openerLabel')} *</Label>
                  <select
                    id="opener_type"
                    value={form.opener_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, opener_type: e.target.value as OpenerType }))
                    }
                    disabled={saving}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    {OPENER_TYPES.map((o) => (
                      <option key={o} value={o}>
                        {t(`tickets.opener.${o}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t('tickets.statusLabel')}</Label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as TicketStatus }))
                    }
                    disabled={saving}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`tickets.status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opener_name">{t('tickets.openerName')}</Label>
                  <Input
                    id="opener_name"
                    value={form.opener_name}
                    onChange={(e) => setForm((f) => ({ ...f, opener_name: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opener_contact">{t('tickets.openerContact')}</Label>
                  <Input
                    id="opener_contact"
                    value={form.opener_contact}
                    onChange={(e) => setForm((f) => ({ ...f, opener_contact: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_id">{t('tickets.project')}</Label>
                  <select
                    id="project_id"
                    value={form.project_id}
                    onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                    disabled={saving}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="">{t('tickets.noProject')}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to_id">{t('tickets.assignedTo')}</Label>
                  <select
                    id="assigned_to_id"
                    value={form.assigned_to_id}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_to_id: e.target.value }))}
                    disabled={saving}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="">{t('tickets.unassigned')}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
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
