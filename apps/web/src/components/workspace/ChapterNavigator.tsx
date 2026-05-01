import { Button, Input, SkeletonRows } from '@spex/ui';
import { CheckCircle2, ChevronLeft, Folder, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  estimated_total: number | null;
  sort_order: number;
}

interface QcAggregate {
  // attention = number of failed checks
  attention: number;
  // open = number of pending/in_progress/waiting
  open: number;
  // total checks
  total: number;
  // done count
  done: number;
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
  onAddChapter?: () => void;
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
  onAddChapter,
}: ChapterNavigatorProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

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
          {canEdit && onAddChapter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onAddChapter}
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
      ) : filteredChapters.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500">
          {search ? t('workspace.noMatches') : t('workspace.noChapters')}
        </p>
      ) : (
        <div className="px-2 py-2 space-y-1">
          {filteredChapters.map((c) => {
            const items = itemsByChapter.get(c.id) ?? [];
            const expanded = expandedChapters.has(c.id);
            const chapterAttention = items.some((i) => (qcByLine[i.id]?.attention ?? 0) > 0);
            return (
              <div key={c.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-200 text-start"
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
                {expanded && (
                  <div className="ms-2 mt-0.5 space-y-0.5">
                    {items.length === 0 ? (
                      <p className="px-3 py-2 ps-8 text-xs text-slate-400 italic">
                        {t('workspace.noLines')}
                      </p>
                    ) : (
                      items.map((item) => {
                        const isCurrent =
                          selectedChapterId === c.id && selectedLineId === item.id;
                        const qc = qcByLine[item.id];
                        const hasAttention = qc && qc.attention > 0;
                        const progress =
                          qc && qc.total > 0
                            ? Math.round((qc.done / qc.total) * 100)
                            : null;
                        const isDone = qc && qc.total > 0 && qc.done === qc.total;
                        const rowCls = isCurrent
                          ? 'w-full flex items-center gap-2 px-3 py-2 ps-8 rounded-md text-start bg-primary/5 border-e-[3px] border-e-primary text-slate-900 font-medium'
                          : hasAttention
                            ? 'w-full flex items-center gap-2 px-3 py-2 ps-8 rounded-md text-start bg-rose-50/60 hover:bg-rose-100/60'
                            : 'w-full flex items-center gap-2 px-3 py-2 ps-8 rounded-md text-start hover:bg-slate-200';
                        return (
                          <button
                            key={item.id}
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
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
