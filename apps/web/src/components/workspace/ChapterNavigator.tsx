import { Button, Input, Label, SkeletonRows } from '@spex/ui';
import {
  CheckCircle2,
  ChevronLeft,
  Folder,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface Chapter {
  id: string;
  name: string;
  sort_order: number;
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

interface QcAggregate {
  attention: number;
  open: number;
  total: number;
  done: number;
}

export interface ChapterDraft {
  name: string;
}

export interface LineDraft {
  description: string;
  unit: string;
  quantity: string;  // string for form input, parsed on submit
  unit_price: string;
}

interface ChapterNavigatorProps {
  loading: boolean;
  chapters: Chapter[];
  lineItems: LineItem[];
  qcByLine: Record<string, QcAggregate>;
  selectedChapterId: string | null;
  selectedLineId: string | null;
  expandedChapters: Set<string>;
  onToggleChapter: (chapterId: string) => void;
  onSelectLine: (chapterId: string, lineId: string) => void;
  canEdit: boolean;
  // Phase 78 mutation hooks (no-ops if canEdit=false)
  onCreateChapter?: (draft: ChapterDraft) => Promise<void>;
  onRenameChapter?: (id: string, draft: ChapterDraft) => Promise<void>;
  onDeleteChapter?: (id: string) => Promise<void>;
  onCreateLine?: (chapterId: string, draft: LineDraft) => Promise<void>;
  onUpdateLine?: (id: string, draft: LineDraft) => Promise<void>;
  onDeleteLine?: (id: string) => Promise<void>;
}

export function ChapterNavigator({
  loading,
  chapters,
  lineItems,
  qcByLine,
  selectedChapterId,
  selectedLineId,
  expandedChapters,
  onToggleChapter,
  onSelectLine,
  canEdit,
  onCreateChapter,
  onRenameChapter,
  onDeleteChapter,
  onCreateLine,
  onUpdateLine,
  onDeleteLine,
}: ChapterNavigatorProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [addingLineFor, setAddingLineFor] = useState<string | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const itemsByChapter = useMemo(() => {
    const map = new Map<string, LineItem[]>();
    for (const item of lineItems) {
      const existing = map.get(item.chapter_id);
      if (existing) existing.push(item);
      else map.set(item.chapter_id, [item]);
    }
    for (const items of map.values()) {
      items.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [lineItems]);

  const filteredChapters = useMemo(() => {
    if (!search.trim()) return chapters;
    const needle = search.trim().toLowerCase();
    return chapters.filter((c) => {
      if (c.name.toLowerCase().includes(needle)) return true;
      const lines = itemsByChapter.get(c.id) ?? [];
      return lines.some((l) => l.description.toLowerCase().includes(needle));
    });
  }, [chapters, itemsByChapter, search]);

  function closeAllForms() {
    setAddingChapter(false);
    setEditingChapterId(null);
    setAddingLineFor(null);
    setEditingLineId(null);
  }

  return (
    <aside
      className="w-64 shrink-0 bg-slate-100 border-l border-slate-200 overflow-y-auto"
      aria-label={t('workspace.chapters')}
    >
      <div className="px-4 py-3 sticky top-0 bg-slate-100/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {t('workspace.chapters')}
          </h2>
          {canEdit && onCreateChapter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                closeAllForms();
                setAddingChapter(true);
              }}
              aria-label={t('workspace.addChapter')}
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
            </Button>
          )}
        </div>
        <div className="relative mt-2">
          <Search className="w-3.5 h-3.5 absolute top-2 start-2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('workspace.searchPlaceholder')}
            className="bg-white text-xs ps-7 pe-2 py-1.5 h-auto"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-2"><SkeletonRows count={6} /></div>
      ) : filteredChapters.length === 0 && !addingChapter ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500">
          {search ? t('workspace.noMatches') : t('workspace.noChapters')}
        </p>
      ) : (
        <div className="px-2 py-2 space-y-1">
          {filteredChapters.map((c) => {
            const items = itemsByChapter.get(c.id) ?? [];
            const expanded = expandedChapters.has(c.id);
            const chapterAttention = items.some((i) => (qcByLine[i.id]?.attention ?? 0) > 0);
            const isEditingThisChapter = editingChapterId === c.id;
            const isAddingLineHere = addingLineFor === c.id;

            return (
              <div key={c.id}>
                {isEditingThisChapter && onRenameChapter ? (
                  <div className="px-3 py-2 bg-primary/5 rounded-md">
                    <ChapterForm
                      initial={{ name: c.name }}
                      saving={busy}
                      onSubmit={async (d) => {
                        setBusy(true);
                        try { await onRenameChapter(c.id, d); }
                        finally { setBusy(false); setEditingChapterId(null); }
                      }}
                      onCancel={() => setEditingChapterId(null)}
                    />
                  </div>
                ) : (
                  <div className="group flex items-center gap-1">
                    <button
                      type="button"
                      className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-200 text-start min-w-0"
                      aria-expanded={expanded}
                      onClick={() => onToggleChapter(c.id)}
                    >
                      <ChevronLeft
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
                      />
                      <Folder className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 truncate">
                        {c.name}
                      </span>
                      {chapterAttention && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"
                          title={t('workspace.attentionFlag')}
                        />
                      )}
                      <span className="text-xs text-slate-500 nums">{items.length}</span>
                    </button>
                    {canEdit && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        {onRenameChapter && (
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            onClick={() => {
                              closeAllForms();
                              setEditingChapterId(c.id);
                            }}
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteChapter && (
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-rose-100 text-slate-500 hover:text-rose-700"
                            onClick={async () => {
                              if (!confirm(t('workspace.confirmDeleteChapter', { name: c.name }))) return;
                              setBusy(true);
                              try { await onDeleteChapter(c.id); }
                              finally { setBusy(false); }
                            }}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {expanded && (
                  <div className="ms-2 mt-0.5 space-y-0.5">
                    {items.length === 0 && !isAddingLineHere ? (
                      <p className="px-3 py-2 ps-8 text-xs text-slate-400 italic">
                        {t('workspace.noLines')}
                      </p>
                    ) : (
                      items.map((item) => {
                        const isCurrent =
                          selectedChapterId === c.id && selectedLineId === item.id;
                        const isEditingThisLine = editingLineId === item.id;
                        const qc = qcByLine[item.id];
                        const hasAttention = qc && qc.attention > 0;
                        const progress =
                          qc && qc.total > 0 ? Math.round((qc.done / qc.total) * 100) : null;
                        const isDone = qc && qc.total > 0 && qc.done === qc.total;
                        const rowCls = isCurrent
                          ? 'flex-1 flex items-center gap-2 px-3 py-2 ps-8 rounded-md text-start bg-primary/5 border-e-[3px] border-e-primary text-slate-900 font-medium min-w-0'
                          : hasAttention
                            ? 'flex-1 flex items-center gap-2 px-3 py-2 ps-8 rounded-md text-start bg-rose-50/60 hover:bg-rose-100/60 min-w-0'
                            : 'flex-1 flex items-center gap-2 px-3 py-2 ps-8 rounded-md text-start hover:bg-slate-200 min-w-0';

                        if (isEditingThisLine && onUpdateLine) {
                          return (
                            <div key={item.id} className="ms-2 px-3 py-2 bg-primary/5 rounded-md">
                              <LineForm
                                initial={{
                                  description: item.description,
                                  unit: item.unit ?? '',
                                  quantity: item.quantity?.toString() ?? '',
                                  unit_price: item.unit_price?.toString() ?? '',
                                }}
                                saving={busy}
                                onSubmit={async (d) => {
                                  setBusy(true);
                                  try { await onUpdateLine(item.id, d); }
                                  finally { setBusy(false); setEditingLineId(null); }
                                }}
                                onCancel={() => setEditingLineId(null)}
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="group flex items-center gap-1">
                            <button
                              type="button"
                              className={rowCls}
                              aria-current={isCurrent ? 'true' : undefined}
                              onClick={() => onSelectLine(c.id, item.id)}
                            >
                              <span className="text-sm truncate text-slate-700 flex-1 min-w-0">
                                {item.description}
                              </span>
                              {hasAttention ? (
                                <span className="text-[10px] nums px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium shrink-0">
                                  {qc!.attention}
                                </span>
                              ) : isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : progress != null && progress > 0 ? (
                                <span className="text-[10px] nums text-slate-500 shrink-0">
                                  {progress}%
                                </span>
                              ) : (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"
                                  title={t('workspace.notStarted')}
                                />
                              )}
                            </button>
                            {canEdit && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                {onUpdateLine && (
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-slate-200 text-slate-500"
                                    onClick={() => {
                                      closeAllForms();
                                      setEditingLineId(item.id);
                                    }}
                                    aria-label={t('common.edit')}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                                {onDeleteLine && (
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-rose-100 text-slate-500 hover:text-rose-700"
                                    onClick={async () => {
                                      if (!confirm(t('workspace.confirmDeleteLine', { name: item.description }))) return;
                                      setBusy(true);
                                      try { await onDeleteLine(item.id); }
                                      finally { setBusy(false); }
                                    }}
                                    aria-label={t('common.delete')}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {isAddingLineHere && onCreateLine ? (
                      <div className="ms-2 px-3 py-2 bg-primary/5 rounded-md">
                        <LineForm
                          initial={{ description: '', unit: '', quantity: '', unit_price: '' }}
                          saving={busy}
                          onSubmit={async (d) => {
                            setBusy(true);
                            try { await onCreateLine(c.id, d); }
                            finally { setBusy(false); setAddingLineFor(null); }
                          }}
                          onCancel={() => setAddingLineFor(null)}
                        />
                      </div>
                    ) : (
                      canEdit && onCreateLine && (
                        <button
                          type="button"
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 ps-8 text-xs text-primary hover:bg-primary/5 rounded-md"
                          onClick={() => {
                            closeAllForms();
                            setAddingLineFor(c.id);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          {t('workspace.addLine')}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {addingChapter && onCreateChapter && (
            <div className="px-3 py-2 bg-primary/5 rounded-md">
              <ChapterForm
                initial={{ name: '' }}
                saving={busy}
                onSubmit={async (d) => {
                  setBusy(true);
                  try { await onCreateChapter(d); }
                  finally { setBusy(false); setAddingChapter(false); }
                }}
                onCancel={() => setAddingChapter(false)}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

interface ChapterFormProps {
  initial: ChapterDraft;
  saving: boolean;
  onSubmit: (draft: ChapterDraft) => void | Promise<void>;
  onCancel: () => void;
}

function ChapterForm({ initial, saving, onSubmit, onCancel }: ChapterFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);

  function handle(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    void onSubmit({ name: name.trim() });
  }

  return (
    <form onSubmit={handle} className="space-y-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('workspace.chapterNamePlaceholder')}
        className="text-sm"
        autoFocus
        required
      />
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

interface LineFormProps {
  initial: LineDraft;
  saving: boolean;
  onSubmit: (draft: LineDraft) => void | Promise<void>;
  onCancel: () => void;
}

function LineForm({ initial, saving, onSubmit, onCancel }: LineFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<LineDraft>(initial);

  function handle(e: FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return;
    void onSubmit({
      description: draft.description.trim(),
      unit: draft.unit.trim(),
      quantity: draft.quantity.trim(),
      unit_price: draft.unit_price.trim(),
    });
  }

  return (
    <form onSubmit={handle} className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor="line-desc" className="text-[10px] uppercase tracking-wider text-slate-500">
          {t('workspace.lineForm.description')} *
        </Label>
        <Input
          id="line-desc"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="text-sm"
          autoFocus
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-1">
        <div>
          <Label htmlFor="line-qty" className="text-[10px] uppercase tracking-wider text-slate-500">
            {t('workspace.lineForm.quantity')}
          </Label>
          <Input
            id="line-qty"
            type="number"
            min="0"
            step="any"
            value={draft.quantity}
            onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="line-unit" className="text-[10px] uppercase tracking-wider text-slate-500">
            {t('workspace.lineForm.unit')}
          </Label>
          <Input
            id="line-unit"
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
            className="text-sm"
            placeholder={t('workspace.lineForm.unitPlaceholder')}
          />
        </div>
        <div>
          <Label htmlFor="line-price" className="text-[10px] uppercase tracking-wider text-slate-500">
            {t('workspace.lineForm.unitPrice')}
          </Label>
          <Input
            id="line-price"
            type="number"
            min="0"
            value={draft.unit_price}
            onChange={(e) => setDraft({ ...draft, unit_price: e.target.value })}
            className="text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
