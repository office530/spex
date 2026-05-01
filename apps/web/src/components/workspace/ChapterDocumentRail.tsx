import { Button, EmptyState, SkeletonRows } from '@spex/ui';
import {
  ChevronLeft,
  FileText,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

interface DocRow {
  id: string;
  filename: string;
  folder_path: string | null;
  tags: string[] | null;
  created_at: string;
}

interface ChapterDocumentRailProps {
  projectId: string;
  chapterId: string | null;
  chapterName: string | null;
}

// Documents are tagged with chapter via the existing `tags` JSONB column.
// Tag convention: `chapter:<chapter-uuid>` for hard scope, plus folder subfolders.
// In the absence of any chapter tag we fall back to "all project docs".
export function ChapterDocumentRail({ projectId, chapterId, chapterName }: ChapterDocumentRailProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDocs(null);
      let query = supabase
        .from('documents')
        .select('id, filename, folder_path, tags, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (chapterId) {
        query = query.contains('tags', [`chapter:${chapterId}`]);
      }
      const { data } = await query;
      if (cancelled) return;
      setDocs((data as unknown as DocRow[]) ?? []);
      setActiveFolder(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, chapterId]);

  const folders = useMemo(() => {
    if (!docs) return [];
    const counts = new Map<string, number>();
    for (const d of docs) {
      const f = d.folder_path?.trim() || '_root';
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([path, count]) => ({ path, count }));
  }, [docs]);

  const visibleDocs = useMemo(() => {
    if (!docs) return [];
    if (!activeFolder) return docs.slice(0, 8);
    if (activeFolder === '_root') return docs.filter((d) => !d.folder_path);
    return docs.filter((d) => d.folder_path === activeFolder);
  }, [docs, activeFolder]);

  if (collapsed) {
    return (
      <aside className="w-12 shrink-0 bg-slate-100 border-e border-slate-200 overflow-hidden flex flex-col items-center py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-600"
          onClick={() => setCollapsed(false)}
          aria-label={t('workspace.docrail.expand')}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className="w-72 shrink-0 bg-slate-100 border-e border-slate-200 overflow-y-auto"
      aria-label={t('workspace.docrail.title')}
    >
      <div className="px-3 py-3 sticky top-0 bg-slate-100/95 backdrop-blur z-10 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-600"
            onClick={() => setCollapsed(true)}
            aria-label={t('workspace.docrail.collapse')}
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {t('workspace.docrail.title')}
            </div>
            <div className="text-xs text-slate-700 mt-0.5 truncate">{chapterName ?? '—'}</div>
          </div>
        </div>
      </div>

      {docs === null ? (
        <SkeletonRows count={4} />
      ) : docs.length === 0 ? (
        <div className="px-4 py-8">
          <EmptyState
            icon={FileText}
            title={t('workspace.docrail.empty')}
            description={t('workspace.docrail.emptyHint')}
          />
        </div>
      ) : (
        <div className="px-2 py-2 space-y-3">
          <div className="space-y-0.5">
            <button
              type="button"
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                activeFolder === null
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setActiveFolder(null)}
            >
              {activeFolder === null ? (
                <FolderOpen className="w-4 h-4 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="flex-1 text-start truncate">{t('workspace.docrail.allDocs')}</span>
              <span className="text-[10px] nums">{docs.length}</span>
            </button>
            {folders.map((f) => {
              const sel = activeFolder === f.path;
              const display = f.path === '_root' ? t('workspace.docrail.uncategorized') : f.path;
              return (
                <button
                  key={f.path}
                  type="button"
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                    sel
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                  onClick={() => setActiveFolder(f.path)}
                >
                  {sel ? (
                    <FolderOpen className="w-4 h-4 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="flex-1 text-start truncate">{display}</span>
                  <span className="text-[10px] nums text-slate-500">{f.count}</span>
                </button>
              );
            })}
          </div>

          <hr className="border-slate-200" />

          <div className="space-y-2">
            <div className="px-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {activeFolder === null
                ? t('workspace.docrail.recent')
                : activeFolder === '_root'
                  ? t('workspace.docrail.uncategorized')
                  : activeFolder}
            </div>
            {visibleDocs.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-slate-400 italic">
                {t('workspace.docrail.folderEmpty')}
              </div>
            ) : (
              visibleDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)
            )}
          </div>

          <hr className="border-slate-200" />

          <button
            type="button"
            className="w-full text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 border border-dashed border-primary/40 rounded-md py-2 flex items-center justify-center gap-1.5 transition-colors"
            onClick={() => alert(t('workspace.docrail.uploadComingSoon'))}
          >
            <Upload className="w-3.5 h-3.5" />
            {t('workspace.docrail.upload')}
          </button>
        </div>
      )}
    </aside>
  );
}

function DocCard({ doc }: { doc: DocRow }) {
  const { i18n } = useTranslation();
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' }),
    [i18n.language],
  );
  return (
    <article className="bg-white rounded-md border border-slate-200 p-2.5 hover:border-slate-300">
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{doc.filename}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span>{dateFmt.format(new Date(doc.created_at))}</span>
            {doc.folder_path && (
              <>
                <ChevronLeft className="w-2.5 h-2.5" />
                <span className="truncate">{doc.folder_path}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
