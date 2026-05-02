import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
} from '@spex/ui';
import { FolderKanban } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { ChapterDocumentRail } from '../components/workspace/ChapterDocumentRail';
import {
  ChapterNavigator,
  type ChapterDraft,
  type LineDraft,
} from '../components/workspace/ChapterNavigator';
import { LineItemDetail } from '../components/workspace/LineItemDetail';
import { type QcCheckStatus } from '../lib/qcHelpers';
import { supabase } from '../lib/supabase';

type Tab = 'overview' | 'qc' | 'procurement' | 'tasks';
const VALID_TABS: Tab[] = ['overview', 'qc', 'procurement', 'tasks'];
const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

interface ProjectInfo {
  id: string;
  name: string;
  pm_id: string | null;
}

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

interface QcCheckLite {
  line_item_id: string;
  status: QcCheckStatus;
  due_date: string | null;
}

interface QuoteAggregate {
  line_item_id: string;
}

interface TaskLite {
  boq_line_item_id: string;
  status: string;
  assignee_id: string | null;
}

export function ProjectWorkspacePage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user } = useAuth();
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [qcChecks, setQcChecks] = useState<QcCheckLite[]>([]);
  const [quotes, setQuotes] = useState<QuoteAggregate[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const chapterIdParam = searchParams.get('chapter');
  const lineIdParam = searchParams.get('line');
  const tabParam = (searchParams.get('tab') as Tab) ?? 'overview';
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'overview';

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    const [projRes, chapRes, lineRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, pm_id')
        .eq('id', projectId)
        .maybeSingle(),
      supabase
        .from('boq_chapters')
        .select('id, name, sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('boq_line_items')
        .select(
          'id, chapter_id, description, unit, quantity, unit_price, estimated_total, notes, sort_order',
        )
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true }),
    ]);
    setProject((projRes.data as ProjectInfo | null) ?? null);
    setChapters((chapRes.data as Chapter[]) ?? []);
    setLineItems((lineRes.data as LineItem[]) ?? []);

    const lineIds = (lineRes.data as LineItem[] | null)?.map((l) => l.id) ?? [];
    if (lineIds.length > 0) {
      const [qcRes, quoteRes, taskRes] = await Promise.all([
        supabase
          .from('boq_line_item_checks')
          .select('line_item_id, status, due_date')
          .in('line_item_id', lineIds),
        supabase
          .from('supplier_quotes')
          .select('boq_line_item_id')
          .in('boq_line_item_id', lineIds),
        supabase
          .from('tasks')
          .select('boq_line_item_id, status, assignee_id')
          .in('boq_line_item_id', lineIds),
      ]);
      setQcChecks((qcRes.data as unknown as QcCheckLite[]) ?? []);
      setQuotes(
        ((quoteRes.data as Array<{ boq_line_item_id: string }>) ?? []).map((q) => ({
          line_item_id: q.boq_line_item_id,
        })),
      );
      setTasks((taskRes.data as TaskLite[]) ?? []);
    } else {
      setQcChecks([]);
      setQuotes([]);
      setTasks([]);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    void loadAll().finally(() => setLoading(false));
  }, [projectId, loadAll]);

  // Aggregate QC + quotes per line for navigator + tab badges
  const qcByLine = useMemo(() => {
    const map: Record<
      string,
      { attention: number; open: number; total: number; done: number }
    > = {};
    for (const c of qcChecks) {
      const entry = map[c.line_item_id] ?? { attention: 0, open: 0, total: 0, done: 0 };
      entry.total += 1;
      if (c.status === 'failed') entry.attention += 1;
      if (c.status === 'pending' || c.status === 'in_progress' || c.status === 'waiting') {
        entry.open += 1;
      }
      if (c.status === 'done') entry.done += 1;
      map[c.line_item_id] = entry;
    }
    return map;
  }, [qcChecks]);

  const quoteByLine = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of quotes) {
      map[q.line_item_id] = (map[q.line_item_id] ?? 0) + 1;
    }
    return map;
  }, [quotes]);

  const tasksOpenByLine = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === 'done' || t.status === 'cancelled') continue;
      map[t.boq_line_item_id] = (map[t.boq_line_item_id] ?? 0) + 1;
    }
    return map;
  }, [tasks]);

  // Default selection: first chapter, its first line
  useEffect(() => {
    if (loading) return;
    if (chapters.length === 0) return;
    if (!chapterIdParam || !chapters.find((c) => c.id === chapterIdParam)) {
      const first = chapters[0];
      if (!first) return;
      const firstLine = lineItems.find((l) => l.chapter_id === first.id);
      const next = new URLSearchParams(searchParams);
      next.set('chapter', first.id);
      if (firstLine) next.set('line', firstLine.id);
      setExpandedChapters((prev) => new Set(prev).add(first.id));
      setSearchParams(next, { replace: true });
    } else {
      setExpandedChapters((prev) => {
        if (prev.has(chapterIdParam)) return prev;
        const next = new Set(prev);
        next.add(chapterIdParam);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, chapters, lineItems, chapterIdParam]);

  const selectedChapter = chapters.find((c) => c.id === chapterIdParam) ?? null;
  const selectedLine = lineItems.find((l) => l.id === lineIdParam) ?? null;

  // Permission gates per BLUEPRINT.md §7
  const isAssignedPm = project?.pm_id != null && project.pm_id === user?.id;
  const canCrud = isAdmin || isAssignedPm;
  const canComment = true; // any project member who can read can comment (RLS enforces)
  const canEditOwnTasks = !canCrud; // foreman / non-PM can update status of own tasks via RLS

  // Phase 78 mutation handlers — only wired when canCrud
  const createChapter = useCallback(
    async (draft: ChapterDraft) => {
      if (!projectId) return;
      const sortOrder = chapters.length + 1;
      const { error } = await supabase
        .from('boq_chapters')
        .insert({ project_id: projectId, name: draft.name, sort_order: sortOrder });
      if (error) {
        toast.error(t('common.errorToast'));
        return;
      }
      toast.success(t('common.createdToast'));
      await loadAll();
    },
    [projectId, chapters.length, loadAll, t],
  );

  const renameChapter = useCallback(
    async (id: string, draft: ChapterDraft) => {
      const { error } = await supabase
        .from('boq_chapters')
        .update({ name: draft.name })
        .eq('id', id);
      if (error) {
        toast.error(t('common.errorToast'));
        return;
      }
      toast.success(t('common.savedToast'));
      await loadAll();
    },
    [loadAll, t],
  );

  const deleteChapter = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('boq_chapters').delete().eq('id', id);
      if (error) {
        toast.error(t('common.errorToast'));
        return;
      }
      toast.success(t('common.deletedToast'));
      await loadAll();
    },
    [loadAll, t],
  );

  const parseLineFields = (draft: LineDraft) => {
    const qty = draft.quantity ? Number(draft.quantity) : null;
    const price = draft.unit_price ? Number(draft.unit_price) : null;
    return {
      description: draft.description,
      unit: draft.unit || null,
      quantity: qty != null && Number.isFinite(qty) ? qty : null,
      unit_price: price != null && Number.isFinite(price) ? price : null,
      notes: draft.notes ? draft.notes : null,
      estimated_total:
        qty != null && price != null && Number.isFinite(qty) && Number.isFinite(price)
          ? Math.round(qty * price)
          : null,
    };
  };

  const createLine = useCallback(
    async (chapterId: string, draft: LineDraft) => {
      if (!projectId) return;
      const sortOrder =
        lineItems.filter((l) => l.chapter_id === chapterId).length + 1;
      const { error } = await supabase.from('boq_line_items').insert({
        chapter_id: chapterId,
        project_id: projectId,
        ...parseLineFields(draft),
        sort_order: sortOrder,
      });
      if (error) {
        toast.error(t('common.errorToast'));
        return;
      }
      toast.success(t('common.createdToast'));
      await loadAll();
    },
    [projectId, lineItems, loadAll, t],
  );

  const updateLine = useCallback(
    async (id: string, draft: LineDraft) => {
      const { error } = await supabase
        .from('boq_line_items')
        .update(parseLineFields(draft))
        .eq('id', id);
      if (error) {
        toast.error(t('common.errorToast'));
        return;
      }
      toast.success(t('common.savedToast'));
      await loadAll();
    },
    [loadAll, t],
  );

  const deleteLine = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('boq_line_items').delete().eq('id', id);
      if (error) {
        toast.error(t('common.errorToast'));
        return;
      }
      toast.success(t('common.deletedToast'));
      await loadAll();
    },
    [loadAll, t],
  );

  function handleToggleChapter(chapterId: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }

  function handleSelectLine(chapterId: string, lineId: string) {
    const next = new URLSearchParams(searchParams);
    next.set('chapter', chapterId);
    next.set('line', lineId);
    next.set('tab', activeTab);
    setSearchParams(next);
    setExpandedChapters((prev) => new Set(prev).add(chapterId));
  }

  function handleTabChange(tab: Tab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  }

  if (!projectId) {
    return (
      <div className="p-6">
        <EmptyState icon={FolderKanban} title={t('workspace.invalid')} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] md:h-screen flex flex-col -mx-4 sm:-mx-6 -my-6">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <Breadcrumb className="mb-1">
          <BreadcrumbItem href="/projects">{t('nav.projects')}</BreadcrumbItem>
          {project && (
            <BreadcrumbItem href={`/projects/${project.id}`}>{project.name}</BreadcrumbItem>
          )}
          <BreadcrumbItem current>{t('workspace.title')}</BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {project?.name ?? t('workspace.title')} — {t('workspace.title')}
          </h1>
          {project && (
            <Link
              to={`/projects/${project.id}`}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {t('workspace.backToProject')} ←
            </Link>
          )}
        </div>
      </header>

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden bg-slate-50">
        <ChapterNavigator
          loading={loading}
          chapters={chapters}
          lineItems={lineItems}
          qcByLine={qcByLine}
          selectedChapterId={chapterIdParam}
          selectedLineId={lineIdParam}
          expandedChapters={expandedChapters}
          onToggleChapter={handleToggleChapter}
          onSelectLine={handleSelectLine}
          canEdit={canCrud}
          onCreateChapter={canCrud ? createChapter : undefined}
          onRenameChapter={canCrud ? renameChapter : undefined}
          onDeleteChapter={canCrud ? deleteChapter : undefined}
          onCreateLine={canCrud ? createLine : undefined}
          onUpdateLine={canCrud ? updateLine : undefined}
          onDeleteLine={canCrud ? deleteLine : undefined}
        />

        {selectedLine && selectedChapter ? (
          <LineItemDetail
            line={selectedLine}
            chapterName={selectedChapter.name}
            projectId={projectId}
            qcAttention={qcByLine[selectedLine.id]?.attention ?? 0}
            qcOpen={qcByLine[selectedLine.id]?.open ?? 0}
            qcTotal={qcByLine[selectedLine.id]?.total ?? 0}
            qcDone={qcByLine[selectedLine.id]?.done ?? 0}
            procurementCount={quoteByLine[selectedLine.id] ?? 0}
            tasksOpenCount={tasksOpenByLine[selectedLine.id] ?? 0}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            canCrud={canCrud}
            canComment={canComment}
            canEditOwnTasks={canEditOwnTasks}
            onUpdateLine={canCrud ? updateLine : undefined}
          />
        ) : (
          <main className="flex-1 min-w-0 bg-white grid place-items-center">
            <EmptyState
              icon={FolderKanban}
              title={
                loading
                  ? t('common.loading')
                  : chapters.length === 0
                    ? t('workspace.noChaptersYet')
                    : t('workspace.pickLine')
              }
              description={!loading && chapters.length === 0 ? t('workspace.noChaptersHint') : undefined}
            />
          </main>
        )}

        <ChapterDocumentRail
          projectId={projectId}
          chapterId={selectedChapter?.id ?? null}
          chapterName={selectedChapter?.name ?? null}
        />
      </div>
    </div>
  );
}
