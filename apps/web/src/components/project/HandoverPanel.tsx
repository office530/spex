import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
} from '@spex/ui';
import { Download, Signature } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface HandoverRow {
  id: string;
  checklist: ChecklistItem[] | null;
  signed_at: string | null;
}

function seedChecklist(t: (k: string) => string): ChecklistItem[] {
  const keys = ['electrical', 'plumbing', 'finishes', 'cleaning', 'keys'];
  return keys.map((k) => ({
    id: crypto.randomUUID(),
    text: t(`handover.defaults.${k}`),
    done: false,
  }));
}

export function HandoverPanel({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const { t, i18n } = useTranslation();
  const [handover, setHandover] = useState<HandoverRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  async function refresh() {
    const { data, error } = await supabase
      .from('handover_protocols')
      .select('id, checklist, signed_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) setError(error.message);
    else setHandover((data as HandoverRow | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createHandover() {
    setCreating(true);
    setError(null);
    const { error } = await supabase.from('handover_protocols').insert({
      project_id: projectId,
      checklist: seedChecklist(t),
    });
    setCreating(false);
    if (error) { setError(error.message); return; }
    await refresh();
  }

  async function updateChecklist(next: ChecklistItem[]) {
    if (!handover) return;
    const previous = handover;
    setHandover({ ...previous, checklist: next });
    const { error } = await supabase
      .from('handover_protocols')
      .update({ checklist: next })
      .eq('id', handover.id);
    if (error) {
      setError(error.message);
      setHandover(previous);
    }
  }

  async function toggleItem(itemId: string) {
    if (!handover || !handover.checklist) return;
    await updateChecklist(
      handover.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
    );
  }

  async function deleteItem(itemId: string) {
    if (!handover || !handover.checklist) return;
    if (!confirm(t('handover.confirmDeleteItem'))) return;
    await updateChecklist(handover.checklist.filter((i) => i.id !== itemId));
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    if (!handover || !newItem.trim()) return;
    setSavingItem(true);
    const next = [
      ...(handover.checklist ?? []),
      { id: crypto.randomUUID(), text: newItem.trim(), done: false },
    ];
    await updateChecklist(next);
    setNewItem('');
    setSavingItem(false);
  }

  async function toggleSigned() {
    if (!handover) return;
    const signed_at = handover.signed_at ? null : new Date().toISOString();
    const previous = handover;
    setHandover({ ...previous, signed_at });
    const { error } = await supabase
      .from('handover_protocols')
      .update({ signed_at })
      .eq('id', handover.id);
    if (error) {
      setError(error.message);
      setHandover(previous);
    }
  }

  async function removeHandover() {
    if (!handover) return;
    if (!confirm(t('handover.confirmDelete'))) return;
    const { error } = await supabase.from('handover_protocols').delete().eq('id', handover.id);
    if (error) setError(error.message);
    else {
      setHandover(null);
      await refresh();
    }
  }

  async function exportPdf() {
    if (!handover) return;
    const { data: project } = await supabase
      .from('projects')
      .select('name, client:clients(company_name)')
      .eq('id', projectId)
      .maybeSingle();
    const proj = project as { name: string; client: { company_name: string } | null } | null;
    try {
      const [{ HandoverPdf }, { downloadPdf }] = await Promise.all([
        import('../../lib/pdf/HandoverPdf'),
        import('../../lib/pdf/download'),
      ]);
      await downloadPdf(
        <HandoverPdf
          projectName={proj?.name ?? '—'}
          clientName={proj?.client?.company_name ?? null}
          checklist={checklist}
          signedAt={handover.signed_at}
          signedDateLabel={t('handover.signedAtLabel', { defaultValue: 'נחתם בתאריך' })}
          unsignedLabel={t('handover.notSigned', { defaultValue: 'טרם נחתם' })}
          generatedAtLabel={t('handover.generatedAt', {
            defaultValue: 'הופק על ידי Spex',
          })}
        />,
        `handover-${(proj?.name ?? 'project').replace(/\s+/g, '-')}.pdf`,
      );
    } catch (e) {
      toast.error(t('common.errorToast'), {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const checklist = handover?.checklist ?? [];
  const done = checklist.filter((i) => i.done).length;
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          {t('handover.title')}
          {handover && checklist.length > 0 && (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              {t('handover.progress', { done, total: checklist.length })}
            </span>
          )}
          {handover?.signed_at && (
            <span className="ms-2 text-xs font-medium text-emerald-700">
              · {t('handover.signedAt', { date: dateFmt.format(new Date(handover.signed_at)) })}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {handover && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportPdf()}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {t('handover.exportPdf')}
            </Button>
          )}
          {canWrite && handover && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => void removeHandover()}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : !handover ? (
          <EmptyState
            icon={Signature}
            title={t('handover.empty')}
            cta={canWrite ? { label: t('handover.create'), onClick: () => void createHandover() } : undefined}
          />
        ) : (
          <div className="divide-y">
            <div className="px-6 py-3 space-y-1">
              {checklist.length === 0 && !canWrite && (
                <p className="text-sm text-muted-foreground">—</p>
              )}
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!canWrite}
                    onChange={() => void toggleItem(item.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span
                    className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {item.text}
                  </span>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-auto px-2 py-1"
                      onClick={() => void deleteItem(item.id)}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {canWrite && (
              <form onSubmit={addItem} className="px-6 py-3 flex items-center gap-2 bg-muted/40">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder={t('handover.itemPlaceholder')}
                  disabled={savingItem}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={savingItem || !newItem.trim()}>
                  {t('handover.addItem')}
                </Button>
              </form>
            )}
            {canWrite && checklist.length > 0 && (
              <div className="px-6 py-3 flex justify-end">
                <Button
                  size="sm"
                  variant={handover.signed_at ? 'outline' : 'default'}
                  onClick={() => void toggleSigned()}
                >
                  {handover.signed_at ? t('handover.markUnsigned') : t('handover.markSigned')}
                </Button>
              </div>
            )}
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive px-6 pb-3" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
