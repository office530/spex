import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from '@spex/ui';
import { Milestone } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface TemplateRow {
  id: string;
  name: string;
  default_billing_pct: number | null;
  sort_order: number;
}

interface TemplateForm {
  name: string;
  default_billing_pct: string;
  sort_order: string;
}

const EMPTY_FORM: TemplateForm = {
  name: '',
  default_billing_pct: '0',
  sort_order: '0',
};

export function MilestoneTemplatesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const { data, error: dbErr } = await supabase
      .from('milestone_templates')
      .select('id, name, default_billing_pct, sort_order')
      .order('sort_order');
    if (dbErr) setError(dbErr.message);
    else setRows((data as TemplateRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function startAdd() {
    setEditingId(null);
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    setForm({ name: '', default_billing_pct: '0', sort_order: String(nextOrder) });
    setError(null);
    setAdding(true);
  }

  function startEdit(r: TemplateRow) {
    setAdding(false);
    setEditingId(r.id);
    setForm({
      name: r.name,
      default_billing_pct: String(r.default_billing_pct ?? 0),
      sort_order: String(r.sort_order),
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
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      default_billing_pct: form.default_billing_pct ? Number(form.default_billing_pct) : 0,
      sort_order: form.sort_order ? Number(form.sort_order) : 0,
    };
    const { error: dbErr } = adding
      ? await supabase.from('milestone_templates').insert(payload)
      : await supabase.from('milestone_templates').update(payload).eq('id', editingId!);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    cancel();
    await refresh();
  }

  async function remove(r: TemplateRow) {
    if (!confirm(t('settings.milestoneTemplates.confirmDelete'))) return;
    const { error: dbErr } = await supabase.from('milestone_templates').delete().eq('id', r.id);
    if (dbErr) setError(dbErr.message);
    else await refresh();
  }

  const sum = rows.reduce((s, r) => s + (r.default_billing_pct ?? 0), 0);
  const sumOk = sum === 100;

  function renderForm() {
    return (
      <form onSubmit={save} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_100px]">
          <div className="space-y-1">
            <Label htmlFor="mt_name">{t('settings.milestoneTemplates.name')} *</Label>
            <Input
              id="mt_name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mt_pct">{t('settings.milestoneTemplates.billingPct')}</Label>
            <Input
              id="mt_pct"
              type="number"
              min="0"
              max="100"
              value={form.default_billing_pct}
              onChange={(e) => setForm((f) => ({ ...f, default_billing_pct: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mt_sort">{t('settings.milestoneTemplates.sortOrder')}</Label>
            <Input
              id="mt_sort"
              type="number"
              min="0"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
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
          <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('settings.milestoneTemplates.description')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{t('settings.milestoneTemplates.title')}</CardTitle>
            <CardDescription>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  sumOk ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {t('settings.milestoneTemplates.sumLabel', { sum })}
                {!sumOk && <span>· {t('settings.milestoneTemplates.sumWarning')}</span>}
              </span>
            </CardDescription>
          </div>
          {!adding && !editingId && (
            <Button size="sm" variant="outline" onClick={startAdd}>
              {t('settings.milestoneTemplates.add')}
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
                  icon={Milestone}
                  title={t('settings.milestoneTemplates.empty')}
                  cta={{ label: t('settings.milestoneTemplates.add'), onClick: startAdd }}
                />
              ) : (
                <div
                  className="hidden sm:grid gap-2 px-6 py-2 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[80px_1fr_120px_140px]"
                >
                  <div>{t('settings.milestoneTemplates.sortOrder')}</div>
                  <div>{t('settings.milestoneTemplates.name')}</div>
                  <div>{t('settings.milestoneTemplates.billingPct')}</div>
                  <div></div>
                </div>
              )}
              {rows.map((r) =>
                editingId === r.id ? (
                  <div key={r.id}>{renderForm()}</div>
                ) : (
                  <div
                    key={r.id}
                    className="grid gap-2 px-6 py-3 sm:grid-cols-[80px_1fr_120px_140px] sm:items-center"
                  >
                    <div className="text-xs text-muted-foreground">{r.sort_order}</div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-sm">{r.default_billing_pct ?? 0}%</div>
                    <div className="flex items-center gap-1 justify-end">
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
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
