import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  StatusBadge,
} from '@spex/ui';
import { HelpCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

type RfiStatus = 'open' | 'responded' | 'closed';
type RfiRecipient = 'client' | 'consultant' | 'supplier';

const STATUSES: RfiStatus[] = ['open', 'responded', 'closed'];
const RECIPIENTS: RfiRecipient[] = ['client', 'consultant', 'supplier'];

interface RfiRow {
  id: string;
  subject: string;
  body: string;
  recipient_type: RfiRecipient;
  recipient_name: string | null;
  status: RfiStatus;
  response: string | null;
  responded_at: string | null;
}

export function RfiPanel({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<RfiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: '',
    body: '',
    recipient_type: 'client' as RfiRecipient,
    recipient_name: '',
    status: 'open' as RfiStatus,
    response: '',
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const { data, error } = await supabase
      .from('rfis')
      .select('id, subject, body, recipient_type, recipient_name, status, response, responded_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data as RfiRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setEditingId(null);
    setForm({
      subject: '',
      body: '',
      recipient_type: 'client',
      recipient_name: '',
      status: 'open',
      response: '',
    });
    setError(null);
    setAdding(true);
  }

  function startEdit(r: RfiRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      subject: r.subject,
      body: r.body,
      recipient_type: r.recipient_type,
      recipient_name: r.recipient_name ?? '',
      status: r.status,
      response: r.response ?? '',
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
    setSaving(true);
    setError(null);
    const current = rows.find((r) => r.id === editingId);
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      subject: form.subject,
      body: form.body,
      recipient_type: form.recipient_type,
      recipient_name: form.recipient_name || null,
      status: form.status,
      response: form.response || null,
    };
    if (form.response && (!current?.response || current.response !== form.response)) {
      payload.responded_at = now;
      if (form.status === 'open') payload.status = 'responded';
    } else if (!form.response) {
      payload.responded_at = null;
    }
    const { error } = adding
      ? await supabase.from('rfis').insert({ ...payload, project_id: projectId })
      : await supabase.from('rfis').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancel();
    await refresh();
  }

  async function remove(r: RfiRow) {
    if (!confirm(t('rfi.confirmDelete'))) return;
    const { error } = await supabase.from('rfis').delete().eq('id', r.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="rfi_subject">{t('rfi.subject')} *</Label>
            <Input
              id="rfi_subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rfi_recipient">{t('rfi.recipientLabel')}</Label>
            <select
              id="rfi_recipient"
              value={form.recipient_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, recipient_type: e.target.value as RfiRecipient }))
              }
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {RECIPIENTS.map((r) => (
                <option key={r} value={r}>{t(`rfi.recipient.${r}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rfi_recipient_name">{t('rfi.recipientName')}</Label>
            <Input
              id="rfi_recipient_name"
              value={form.recipient_name}
              onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="rfi_body">{t('rfi.body')} *</Label>
            <textarea
              id="rfi_body"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
              required
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rfi_status">{t('rfi.statusLabel')}</Label>
            <select
              id="rfi_status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as RfiStatus }))}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`rfi.status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="rfi_response">{t('rfi.response')}</Label>
            <textarea
              id="rfi_response"
              value={form.response}
              onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}
              rows={3}
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
        <CardTitle className="text-base">{t('rfi.title')}</CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('rfi.add')}
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
                icon={HelpCircle}
                title={t('rfi.empty')}
                cta={canWrite ? { label: t('rfi.add'), onClick: startAdd } : undefined}
              />
            ) : (
              rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <div key={r.id} className="px-6 py-3 space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{r.subject}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t(`rfi.recipient.${r.recipient_type}`)}
                          {r.recipient_name && <span> · {r.recipient_name}</span>}
                        </div>
                      </div>
                      <StatusBadge
                        family="rfi"
                        value={r.status}
                        label={t(`rfi.status.${r.status}`)}
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
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{r.body}</p>
                    {r.response && (
                      <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {t('rfi.response')}
                          {r.responded_at && <span> · {dateFormat.format(new Date(r.responded_at))}</span>}
                        </div>
                        <p className="text-sm whitespace-pre-line">{r.response}</p>
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
