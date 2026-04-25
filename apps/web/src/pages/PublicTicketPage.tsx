import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@spex/ui';
import { CheckCircle2, Hammer, Paperclip, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface TicketInput {
  subject: string;
  body: string;
  opener_name: string;
  opener_contact: string;
}

interface PendingFile {
  file: File;
  previewUrl: string;
}

const EMPTY: TicketInput = { subject: '', body: '', opener_name: '', opener_contact: '' };
const MAX_FILES = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const COOLDOWN_KEY = 'spex.ticket.lastSubmit';
const COOLDOWN_MS = 30_000;

function makeFolderId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function PublicTicketPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<TicketInput>(EMPTY);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setError(null);

    let next = [...files];
    for (const f of picked) {
      if (!f.type.startsWith('image/')) {
        setError(t('tickets.publicAttachmentInvalidType'));
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        setError(t('tickets.publicAttachmentTooLarge', { name: f.name }));
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(t('tickets.publicAttachmentLimit'));
        break;
      }
      next.push({ file: f, previewUrl: URL.createObjectURL(f) });
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadAttachments() {
    if (files.length === 0) return [];
    const folder = makeFolderId();
    const uploaded: { path: string; name: string; size: number; mime: string }[] = [];
    for (const item of files) {
      const ext = item.file.name.includes('.') ? item.file.name.split('.').pop() : '';
      const safeName = `${makeFolderId()}${ext ? `.${ext}` : ''}`;
      const path = `public/${folder}/${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('ticket-uploads')
        .upload(path, item.file, { contentType: item.file.type, upsert: false });
      if (upErr) throw upErr;
      uploaded.push({
        path,
        name: item.file.name,
        size: item.file.size,
        mime: item.file.type,
      });
    }
    return uploaded;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? '0');
    if (Date.now() - last < COOLDOWN_MS) {
      setError(t('tickets.publicCooldown'));
      return;
    }

    setSubmitting(true);

    let attachments: Awaited<ReturnType<typeof uploadAttachments>> = [];
    try {
      attachments = await uploadAttachments();
    } catch {
      setSubmitting(false);
      setError(t('tickets.publicAttachmentUploadFailed'));
      return;
    }

    const { error: insertError } = await supabase.from('tickets').insert({
      subject: form.subject,
      body: form.body,
      opener_type: form.opener_name || form.opener_contact ? 'client' : 'anonymous',
      opener_name: form.opener_name || null,
      opener_contact: form.opener_contact || null,
      status: 'new',
      attachments: attachments.length > 0 ? attachments : null,
    });
    setSubmitting(false);
    if (insertError) {
      if (insertError.message.includes('rate_limit_exceeded')) {
        setError(t('tickets.publicRateLimited'));
      } else {
        setError(insertError.message);
      }
      return;
    }
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setSubmitted(true);
    setForm(EMPTY);
    setFiles([]);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-mesh-hero text-primary-foreground p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <Hammer className="h-5 w-5" />
          </div>
          <div className="text-xl font-bold">{t('app.name')}</div>
        </div>
        <div className="space-y-3 max-w-md">
          <div className="text-3xl font-bold leading-tight">{t('tickets.publicTitle')}</div>
          <p className="text-primary-foreground/80">{t('tickets.publicDescription')}</p>
        </div>
        <div className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Spex</div>
      </div>

      <div className="flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-sm">
          {submitted ? (
            <>
              <CardHeader className="items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <CardTitle>{t('tickets.publicSuccess')}</CardTitle>
                <CardDescription>{t('tickets.publicSuccessDescription')}</CardDescription>
              </CardHeader>
              <CardFooter className="justify-center">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  {t('tickets.publicSubmitAnother')}
                </Button>
              </CardFooter>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle className="text-base">{t('tickets.publicTitle')}</CardTitle>
                <CardDescription>{t('tickets.publicDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">{t('tickets.subject')} *</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">{t('tickets.body')} *</Label>
                  <textarea
                    id="body"
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    required
                    rows={5}
                    disabled={submitting}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opener_name">{t('tickets.openerName')}</Label>
                  <Input
                    id="opener_name"
                    value={form.opener_name}
                    onChange={(e) => setForm((f) => ({ ...f, opener_name: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opener_contact">{t('tickets.openerContact')}</Label>
                  <Input
                    id="opener_contact"
                    value={form.opener_contact}
                    onChange={(e) => setForm((f) => ({ ...f, opener_contact: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('tickets.publicAttachments')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('tickets.publicAttachmentsHint')}
                  </p>
                  <input
                    ref={fileInputRef}
                    id="ticket-attachments"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={addFiles}
                    disabled={submitting || files.length >= MAX_FILES}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || files.length >= MAX_FILES}
                    className="gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    {t('tickets.publicAttachmentsAdd')}
                  </Button>
                  {files.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {files.map((f, i) => (
                        <div
                          key={f.previewUrl}
                          className="relative group rounded-md overflow-hidden border bg-muted"
                        >
                          <img
                            src={f.previewUrl}
                            alt={f.file.name}
                            className="aspect-square object-cover w-full"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            disabled={submitting}
                            aria-label={t('tickets.publicAttachmentsRemove')}
                            className="absolute top-1 end-1 h-6 w-6 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t('tickets.publicSubmitting') : t('tickets.publicSubmit')}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
