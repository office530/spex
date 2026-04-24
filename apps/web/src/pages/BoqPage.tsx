import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  StatusBadge,
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
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(chapter.name);
  const [savingName, setSavingName] = useState(false);

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

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setSavingName(true);
    setError(null);
    const { error } = await supabase
      .from('boq_chapters')
      .update({ name: nameDraft.trim() })
      .eq('id', chapter.id);
    setSavingName(false);
    if (error) { setError(error.message); return; }
    setEditingName(false);
    onChange();
  }

  function cancelNameEdit() {
    setNameDraft(chapter.name);
    setEditingName(false);
    setError(null);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <form onSubmit={saveName} className="flex items-center gap-2">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                required
                disabled={savingName}
                autoFocus
                className="h-8"
              />
              <Button type="submit" size="sm" disabled={savingName}>
                {savingName ? t('common.saving') : t('common.save')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={cancelNameEdit}
                disabled={savingName}
              >
                {t('common.cancel')}
              </Button>
            </form>
          ) : (
            <>
              <CardTitle className="text-base truncate">{chapter.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('boq.chapterTotal')}: {formatCurrency(chapterTotal)}
              </p>
            </>
          )}
        </div>
        {canWrite && !editingName && (
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => { setNameDraft(chapter.name); setEditingName(true); }}>
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              {t('common.delete')}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {chapter.items.length === 0 && !addingItem ? (
          <p className="text-sm text-muted-foreground px-6 py-4">{t('boq.emptyLineItems')}</p>
        ) : (
          <div className="divide-y">
            <div
              className={`hidden sm:grid gap-2 px-6 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground ${
                canWrite
                  ? 'sm:grid-cols-[1fr_100px_120px_140px_140px]'
                  : 'sm:grid-cols-[1fr_100px_120px_140px]'
              }`}
            >
              <div>{t('boq.description')}</div>
              <div>{t('boq.quantity')}</div>
              <div>{t('boq.unitPrice')}</div>
              <div>{t('boq.estimatedTotal')}</div>
              {canWrite && <div></div>}
            </div>
            {chapter.items.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                projectId={projectId}
                canWrite={canWrite}
                onChange={onChange}
              />
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

interface LineItemRowProps {
  item: LineItem;
  projectId: string;
  canWrite: boolean;
  onChange: () => void;
}

function LineItemRow({ item, projectId, canWrite, onChange }: LineItemRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    description: item.description,
    unit: item.unit ?? '',
    quantity: item.quantity != null ? String(item.quantity) : '',
    unit_price: item.unit_price != null ? String(item.unit_price) : '',
    notes: item.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setForm({
      description: item.description,
      unit: item.unit ?? '',
      quantity: item.quantity != null ? String(item.quantity) : '',
      unit_price: item.unit_price != null ? String(item.unit_price) : '',
      notes: item.notes ?? '',
    });
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const qty = form.quantity ? Number(form.quantity) : null;
    const price = form.unit_price ? Number(form.unit_price) : null;
    const total = qty != null && price != null ? qty * price : null;
    const { error } = await supabase
      .from('boq_line_items')
      .update({
        description: form.description,
        unit: form.unit || null,
        quantity: qty,
        unit_price: price,
        estimated_total: total,
        notes: form.notes || null,
      })
      .eq('id', item.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setEditing(false);
    onChange();
  }

  async function removeItem() {
    if (!confirm(t('boq.confirmDeleteLineItem'))) return;
    const { error } = await supabase.from('boq_line_items').delete().eq('id', item.id);
    if (error) setError(error.message);
    else onChange();
  }

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`edit_desc_${item.id}`}>{t('boq.description')} *</Label>
            <Input
              id={`edit_desc_${item.id}`}
              value={form.description}
              onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit_unit_${item.id}`}>{t('boq.unit')}</Label>
            <Input
              id={`edit_unit_${item.id}`}
              value={form.unit}
              onChange={(e) => setForm((x) => ({ ...x, unit: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit_qty_${item.id}`}>{t('boq.quantity')}</Label>
            <Input
              id={`edit_qty_${item.id}`}
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm((x) => ({ ...x, quantity: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit_price_${item.id}`}>{t('boq.unitPrice')}</Label>
            <Input
              id={`edit_price_${item.id}`}
              type="number"
              min="0"
              value={form.unit_price}
              onChange={(e) => setForm((x) => ({ ...x, unit_price: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`edit_notes_${item.id}`}>{t('common.notes')}</Label>
            <textarea
              id={`edit_notes_${item.id}`}
              value={form.notes}
              onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))}
              rows={2}
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
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
    <div className="px-6 py-3 space-y-2">
      <div
        className={`grid gap-2 sm:items-center ${
          canWrite
            ? 'sm:grid-cols-[1fr_100px_120px_140px_140px]'
            : 'sm:grid-cols-[1fr_100px_120px_140px]'
        }`}
      >
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
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={startEdit}>
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => void removeItem()}
            >
              {t('common.delete')}
            </Button>
          </div>
        )}
      </div>
      <div>
        <Button
          size="sm"
          variant="ghost"
          className="h-auto px-2 py-1 text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '▾' : '▸'} {t('supplierQuotes.title')}
        </Button>
      </div>
      {expanded && (
        <SupplierQuotesList
          lineItemId={item.id}
          projectId={projectId}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}

interface SupplierOption {
  id: string;
  name: string;
}

type SupplierQuoteStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revised';

const SUPPLIER_QUOTE_STATUSES: SupplierQuoteStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'revised',
];

interface SupplierQuoteRow {
  id: string;
  supplier_id: string;
  amount: number | null;
  status: SupplierQuoteStatus;
  supplier: { name: string } | null;
}

interface SupplierQuotesListProps {
  lineItemId: string;
  projectId: string;
  canWrite: boolean;
}

function SupplierQuotesList({ lineItemId, projectId, canWrite }: SupplierQuotesListProps) {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<SupplierQuoteRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{
    supplier_id: string;
    amount: string;
    status: SupplierQuoteStatus;
  }>({ supplier_id: '', amount: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [qRes, sRes] = await Promise.all([
      supabase
        .from('supplier_quotes')
        .select('id, supplier_id, amount, status, supplier:suppliers(name)')
        .eq('boq_line_item_id', lineItemId)
        .order('created_at', { ascending: false }),
      canWrite && suppliers.length === 0
        ? supabase.from('suppliers').select('id, name').eq('status', 'active').order('name')
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (qRes.error) setError(qRes.error.message);
    else setQuotes((qRes.data as unknown as SupplierQuoteRow[]) ?? []);
    if (sRes.data) setSuppliers(sRes.data as SupplierOption[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineItemId]);

  function startAdd() {
    setForm({
      supplier_id: suppliers[0]?.id ?? '',
      amount: '',
      status: 'draft',
    });
    setError(null);
    setAdding(true);
  }

  async function saveQuote(e: FormEvent) {
    e.preventDefault();
    if (!form.supplier_id) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('supplier_quotes').insert({
      project_id: projectId,
      boq_line_item_id: lineItemId,
      supplier_id: form.supplier_id,
      amount: form.amount ? Number(form.amount) : null,
      status: form.status,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setAdding(false);
    await refresh();
  }

  async function removeQuote(q: SupplierQuoteRow) {
    if (!confirm(t('supplierQuotes.confirmDelete'))) return;
    const { error } = await supabase.from('supplier_quotes').delete().eq('id', q.id);
    if (error) setError(error.message);
    else await refresh();
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      {loading ? (
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      ) : quotes.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">{t('supplierQuotes.empty')}</p>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <div key={q.id} className="bg-background rounded overflow-hidden">
              <div className="flex items-center gap-2 text-sm px-3 py-2">
                <div className="flex-1 min-w-0 truncate">{q.supplier?.name ?? '—'}</div>
                <div className="shrink-0 font-medium">{formatCurrency(q.amount)}</div>
                <StatusBadge
                  family="supplier_quote"
                  value={q.status}
                  label={t(`supplierQuotes.status.${q.status}`)}
                  className="shrink-0"
                />
                {canWrite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0 h-auto px-2 py-1"
                    onClick={() => void removeQuote(q)}
                  >
                    {t('common.delete')}
                  </Button>
                )}
              </div>
              <SupplierQuoteComments quoteId={q.id} canWrite={canWrite} />
            </div>
          ))}
        </div>
      )}
      {adding && (
        <form onSubmit={saveQuote} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] items-end bg-background rounded p-3">
          <div className="space-y-1">
            <Label htmlFor={`sq_sup_${lineItemId}`} className="text-xs">
              {t('supplierQuotes.supplier')} *
            </Label>
            <select
              id={`sq_sup_${lineItemId}`}
              value={form.supplier_id}
              onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
              required
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t('supplierQuotes.selectSupplier')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`sq_amt_${lineItemId}`} className="text-xs">
              {t('supplierQuotes.amount')}
            </Label>
            <Input
              id={`sq_amt_${lineItemId}`}
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              disabled={saving}
              className="sm:w-32"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`sq_st_${lineItemId}`} className="text-xs">
              {t('supplierQuotes.statusLabel')}
            </Label>
            <select
              id={`sq_st_${lineItemId}`}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SupplierQuoteStatus }))}
              disabled={saving}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {SUPPLIER_QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`supplierQuotes.status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving || !form.supplier_id}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
          {error && (
            <p className="sm:col-span-4 text-sm text-destructive" role="alert">{error}</p>
          )}
        </form>
      )}
      {canWrite && !adding && (
        <Button size="sm" variant="outline" onClick={startAdd}>
          {t('supplierQuotes.add')}
        </Button>
      )}
    </div>
  );
}

interface SupplierQuoteCommentRow {
  id: string;
  body: string;
  created_at: string;
  user: { full_name: string } | null;
}

function SupplierQuoteComments({ quoteId, canWrite }: { quoteId: string; canWrite: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<SupplierQuoteCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error: dbErr } = await supabase
      .from('supplier_quote_comments')
      .select('id, body, created_at, user:user_profiles(full_name)')
      .eq('quote_id', quoteId)
      .order('created_at');
    if (dbErr) setError(dbErr.message);
    else setComments((data as unknown as SupplierQuoteCommentRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  async function addComment(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !user) return;
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase.from('supplier_quote_comments').insert({
      quote_id: quoteId,
      user_id: user.id,
      body: body.trim(),
    });
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setBody('');
    await refresh();
  }

  async function removeComment(c: SupplierQuoteCommentRow) {
    if (!confirm(t('supplierQuotes.confirmDeleteComment'))) return;
    const { error: dbErr } = await supabase.from('supplier_quote_comments').delete().eq('id', c.id);
    if (dbErr) setError(dbErr.message);
    else await refresh();
  }

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  if (loading) return null;

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-start text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-3 py-1.5"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{t('supplierQuotes.comments')}</span>
        {comments.length > 0 && <span>({comments.length})</span>}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 bg-muted/20">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('supplierQuotes.emptyComments')}</p>
          ) : (
            <div className="space-y-1.5">
              {comments.map((c) => (
                <div key={c.id} className="bg-background rounded p-2 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium">{c.user?.full_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      {dateFmt.format(new Date(c.created_at))}
                      {canWrite && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-auto px-1.5 py-0 text-xs text-destructive hover:text-destructive"
                          onClick={() => void removeComment(c)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-line">{c.body}</p>
                </div>
              ))}
            </div>
          )}
          {canWrite && (
            <form onSubmit={addComment} className="flex items-start gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('supplierQuotes.commentPlaceholder')}
                rows={2}
                disabled={saving}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <Button type="submit" size="sm" disabled={saving || !body.trim()}>
                {t('supplierQuotes.addComment')}
              </Button>
            </form>
          )}
          {error && (
            <p className="text-xs text-destructive" role="alert">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
