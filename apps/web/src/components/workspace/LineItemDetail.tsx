import { Button, formatCurrencyILS, Tabs, TabsContent, TabsList, TabsTrigger } from '@spex/ui';
import { ClipboardCheck, LayoutList, ListChecks, Pencil, Truck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineEditDialog } from './LineEditDialog';
import type { LineDraft } from './LineForm';
import { OverviewTab } from './tabs/OverviewTab';
import { ProcurementTab } from './tabs/ProcurementTab';
import { QcTab } from './tabs/QcTab';
import { TasksTab } from './tabs/TasksTab';

interface LineItem {
  id: string;
  chapter_id: string;
  description: string;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  estimated_total: number | null;
  notes: string | null;
}

interface LineItemDetailProps {
  line: LineItem;
  chapterName: string;
  projectId: string;
  qcAttention: number;
  qcOpen: number;
  qcTotal: number;
  qcDone: number;
  procurementCount: number;
  tasksOpenCount: number;
  activeTab: 'overview' | 'qc' | 'procurement' | 'tasks';
  onTabChange: (tab: 'overview' | 'qc' | 'procurement' | 'tasks') => void;
  canCrud: boolean;
  canComment: boolean;
  canEditOwnTasks: boolean;
  onUpdateLine?: (id: string, draft: LineDraft) => Promise<void>;
}

const BENTO_CARD =
  'bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.03)]';

export function LineItemDetail({
  line,
  chapterName,
  projectId,
  qcAttention,
  qcOpen: _qcOpen,
  qcTotal,
  qcDone,
  procurementCount,
  tasksOpenCount,
  activeTab,
  onTabChange,
  canCrud,
  canComment,
  canEditOwnTasks,
  onUpdateLine,
}: LineItemDetailProps) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const progress = qcTotal > 0 ? Math.round((qcDone / qcTotal) * 100) : 0;

  return (
    <main className="flex-1 min-w-0 bg-slate-50 overflow-y-auto">
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as typeof activeTab)}
        variant="underline"
      >
        <div className="p-3 md:p-4 space-y-3">
          {/* Line meta — title + 4 metric tiles (top card) */}
          <div className={`${BENTO_CARD} p-6`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
                  <span>{chapterName}</span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900 leading-tight tracking-tight">
                  {line.description}
                </h2>
              </div>
              {canCrud && onUpdateLine && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="gap-1 rounded-full"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('common.edit')}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <div className="rounded-xl bg-slate-50/70 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t('workspace.meta.quantity')}
                </div>
                <div className="text-base nums font-semibold mt-1 text-slate-900">
                  {line.quantity ?? '—'}{' '}
                  <span className="text-xs font-normal text-slate-500">{line.unit ?? ''}</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50/70 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t('workspace.meta.unitPrice')}
                </div>
                <div className="text-base nums font-semibold mt-1 text-slate-900">
                  {line.unit_price != null ? formatCurrencyILS(line.unit_price) : '—'}
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-sky-700/80 font-medium">
                  {t('workspace.meta.total')}
                </div>
                <div className="text-base nums font-semibold mt-1 text-sky-900">
                  {line.estimated_total != null ? formatCurrencyILS(line.estimated_total) : '—'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50/70 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t('workspace.meta.qcProgress')}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs nums font-semibold text-slate-900 shrink-0">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Tabs+Body card — tabs are the top edge, content fills below */}
          <div className={`${BENTO_CARD} overflow-hidden`}>
            <div className="border-b border-slate-200/70 px-5 md:px-6 bg-white">
              <TabsList className="border-none">
                <TabsTrigger value="overview">
                  <LayoutList />
                  {t('workspace.tabs.overview')}
                </TabsTrigger>
                <TabsTrigger value="qc" count={qcAttention > 0 ? qcAttention : undefined}>
                  <ClipboardCheck />
                  {t('workspace.tabs.qc')}
                </TabsTrigger>
                <TabsTrigger
                  value="procurement"
                  count={procurementCount > 0 ? procurementCount : undefined}
                >
                  <Truck />
                  {t('workspace.tabs.procurement')}
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  count={tasksOpenCount > 0 ? tasksOpenCount : undefined}
                >
                  <ListChecks />
                  {t('workspace.tabs.tasks')}
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="p-6 min-h-[420px]">
              <TabsContent value="overview">
                <OverviewTab lineId={line.id} notes={line.notes} />
              </TabsContent>
              <TabsContent value="qc">
                <QcTab lineId={line.id} canCrud={canCrud} canComment={canComment} />
              </TabsContent>
              <TabsContent value="procurement">
                <ProcurementTab lineId={line.id} projectId={projectId} canCrud={canCrud} />
              </TabsContent>
              <TabsContent value="tasks">
                <TasksTab
                  lineId={line.id}
                  projectId={projectId}
                  canCrud={canCrud}
                  canEditOwn={canEditOwnTasks}
                />
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>

      {onUpdateLine && (
        <LineEditDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={{
            description: line.description,
            unit: line.unit ?? '',
            quantity: line.quantity?.toString() ?? '',
            unit_price: line.unit_price?.toString() ?? '',
            notes: line.notes ?? '',
          }}
          onSubmit={async (draft) => {
            await onUpdateLine(line.id, draft);
          }}
        />
      )}
    </main>
  );
}
