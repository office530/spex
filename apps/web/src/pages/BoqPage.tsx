import {
  Button,
  Card,
  CardContent,
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

interface ProjectSummary {
  id: string;
  name: string;
  pm_id: string | null;
}

interface LineItem {
  id: string;
  chapter_id: string;
  description: string;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  estimated_total: number | null;
  notes: string | null;
  sort_order: number;
}

interface Chapter {
  id: string;
  name: string;
  sort_order: number;
  items: LineItem[];
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function BoqPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [savingChapter, setSavingChapter] = useState(false);

  const canWrite = isAdmin || (project?.pm_id != null && project.pm_id === user?.id);

  async function refresh() {
    if (!id) return;
    const [projRes, chapRes, itemsRes] = await Promise.all([
      supabase.from('projects').select('id, name, pm_id').eq('id', id).maybeSingle(),
      supabase
        .from('boq_chapters')
        .select('id, name, sort_order')
        .eq('project_id', id)
        .order('sort_order'),
      supabase
        .from('boq_line_items')
        .select('id, chapter_id, description, unit, quantity, unit_price, estimated_total, notes, sort_order')
        .eq('project_id', id)
        .order('sort_order'),
    ]);
    if (projRes.error || !projRes.data) {
      setError(projRes.error?.message ?? t('projects.notFound'));
      setLoading(false);
      return;
    }
    setProject(projRes.data as ProjectSummary);
    if (chapRes.error) setError(chapRes.error.message);
    if (itemsRes.error) setError(itemsRes.error.message);
    const rawChapters = (chapRes.data as Array<{ id: string; name: string; sort_order: number }>) ?? [];
    const rawItems = (itemsRes.data as LineItem[]) ?? [];
    setChapters(
      rawChapters.map((c) => ({
        ...c,
        items: rawItems.filter((it) => it.chapter_id === c.id),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addChapter(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingChapter(true);
    setError(null);
    const nextOrder = chapters.length
      ? Math.max(...chapters.map((c) => c.sort_order)) + 1
      : 0;
    const { error } = await supabase.from('boq_chapters').insert({
      project_id: id,
      name: newChapterName,
      sort_order: nextOrder,
    });
    setSavingChapter(false);
    if (error) { setError(error.message); return; }
    setAddingChapter(false);
    setNewChapterName('');
    await refresh();
  }

  async function removeChapter(c: Chapter) {
    if (!confirm(t('boq.confirmDeleteChapter'))) return;
    const { error } = await supabase.from('boq_chapters').delete().eq('id', c.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const projectTotal = chapters.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + (i.estimated_total ?? 0), 0),
    0,
  );

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('boq.title')}</h1>
          {project && <p className="text-sm text-muted-foreground">{project.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {t('boq.projectTotal')}: <span className="font-semibold text-foreground">{formatCurrency(projectTotal)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)}>
            {t('common.back')}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {chapters.length === 0 && !addingChapter ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{t('boq.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        chapters.map((c) => (
          <ChapterCard
            key={c.id}
            chapter={c}
            projectId={id!}
            canWrite={canWrite}
            onChange={() => void refresh()}
            onDelete={() => void removeChapter(c)}
          />
        ))
      )}

      {canWrite && (
        addingChapter ? (
          <Card>
            <CardContent className="p-4">
              <form onSubmit={addChapter} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="new_chapter_name">{t('boq.chapterName')} *</Label>
                  <Input
                    id="new_chapter_name"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    required
                    disabled={savingChapter}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAddingChapter(false); setNewChapterName(''); }}
                    disabled={savingChapter}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={savingChapter}>
                    {savingChapter ? t('common.saving') : t('common.add')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-start">
            <Button variant="outline" size="sm" onClick={() => setAddingChapter(true)}>
              {t('boq.addChapter')}
            </Button>
          </div>
        )
      )}
    </div>
  );
}

interface ChapterCardProps {
  chapter: Chapter;
  projectId: string;
  canWrite: boolean;
  onChange: () => void;
  onDelete: () => void;
}

function ChapterCard({ chapter, projectId, canWrite, onChange, onDelete }: ChapterCardProps) {
  const { t } = useTranslation();
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    unit: '',
    quantity: '',
    unit_price: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chapterTotal = chapter.items.reduce((s, i) => s + (i.estimated_total ?? 0), 0);

  function resetNewItem() {
    setNewItem({ description: '', unit: '', quantity: '', unit_price: '', notes: '' });
    setError(null);
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const qty = newItem.quantity ? Number(newItem.quantity) : null;
    const price = newItem.unit_price ? Number(newItem.unit_price) : null;
    const total = qty != null && price != null ? qty * price : null;
    const nextOrder = chapter.items.length
      ? Math.max(...chapter.items.map((i) => i.sort_order)) + 1
      : 0;
    const { error } = await supabase.from('boq_line_items').insert({
      project_id: projectId,
      chapter_id: chapter.id,
      description: newItem.description,
      unit: newItem.unit || null,
      quantity: qty,
      unit_price: price,
      estimated_total: total,
      notes: newItem.notes || null,
      sort_order: nextOrder,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setAddingItem(false);
    resetNewItem();
    onChange();
  }

  async function removeItem(item: LineItem) {
    if (!confirm(t('boq.confirmDeleteLineItem'))) return;
    const { error } = await supabase.from('boq_line_items').delete().eq('id', item.id);
    if (error) setError(error.message);
    else onChange();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base truncate">{chapter.name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('boq.chapterTotal')}: {formatCurrency(chapterTotal)}
          </p>
        </div>
        {canWrite && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            {t('common.delete')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {chapter.items.length === 0 && !addingItem ? (
          <p className="text-sm text-muted-foreground px-6 py-4">{t('boq.emptyLineItems')}</p>
        ) : (
          <div className="divide-y">
            {chapter.items.map((item) => (
              <div key={item.id} className="px-6 py-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{item.description}</div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{item.notes}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.quantity ?? '—'} {item.unit ?? ''}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(item.unit_price)}
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(item.estimated_total)}
                </div>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void removeItem(item)}
                  >
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {canWrite && (
          addingItem ? (
            <form onSubmit={addItem} className="px-6 py-4 space-y-3 bg-muted/40 border-t">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`desc_${chapter.id}`}>{t('boq.description')} *</Label>
                  <Input
                    id={`desc_${chapter.id}`}
                    value={newItem.description}
                    onChange={(e) => setNewItem((x) => ({ ...x, description: e.target.value }))}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`unit_${chapter.id}`}>{t('boq.unit')}</Label>
                  <Input
                    id={`unit_${chapter.id}`}
                    value={newItem.unit}
                    onChange={(e) => setNewItem((x) => ({ ...x, unit: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`qty_${chapter.id}`}>{t('boq.quantity')}</Label>
                  <Input
                    id={`qty_${chapter.id}`}
                    type="number"
                    min="0"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((x) => ({ ...x, quantity: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`price_${chapter.id}`}>{t('boq.unitPrice')}</Label>
                  <Input
                    id={`price_${chapter.id}`}
                    type="number"
                    min="0"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem((x) => ({ ...x, unit_price: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`notes_${chapter.id}`}>{t('common.notes')}</Label>
                  <textarea
                    id={`notes_${chapter.id}`}
                    value={newItem.notes}
                    onChange={(e) => setNewItem((x) => ({ ...x, notes: e.target.value }))}
                    rows={2}
                    disabled={saving}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAddingItem(false); resetNewItem(); }}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? t('common.saving') : t('common.add')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="px-6 py-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setAddingItem(true)}>
                {t('boq.addLineItem')}
              </Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
