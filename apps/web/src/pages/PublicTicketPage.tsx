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
import { CheckCircle2, Hammer } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface TicketInput {
  subject: string;
  body: string;
  opener_name: string;
  opener_contact: string;
}

const EMPTY: TicketInput = { subject: '', body: '', opener_name: '', opener_contact: '' };

export function PublicTicketPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<TicketInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('tickets').insert({
      subject: form.subject,
      body: form.body,
      opener_type: form.opener_name || form.opener_contact ? 'client' : 'anonymous',
      opener_name: form.opener_name || null,
      opener_contact: form.opener_contact || null,
      status: 'new',
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
    setForm(EMPTY);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-hero-from to-hero-to text-primary-foreground p-10">
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
