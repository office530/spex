import { Button, formatCurrencyILS, Tabs, TabsContent, TabsList, TabsTrigger } from '@spex/ui';
import { ClipboardCheck, LayoutList, ListChecks, Pencil, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OverviewTab } from './tabs/OverviewTab';
import { ProcurementTab } from './tabs/ProcurementTab';
import { QcTab } from './tabs/QcTab';
import { TasksPlaceholderTab } from './tabs/TasksPlaceholderTab';

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
  activeTab: 'overview' | 'qc' | 'procurement' | 'tasks';
  onTabChange: (tab: 'overview' | 'qc' | 'procurement' | 'tasks') => void;
  canCrud: boolean;     // can CRUD QC + edit BoQ line
  canComment: boolean;  // can post QC comments
}

export function LineItemDetail({
  line,
  chapterName,
  projectId,
  qcAttention,
  qcOpen: _qcOpen,
  qcTotal,
  qcDone,
  procurementCount,
  activeTab,
  onTabChange,
  canCrud,
  canComment,
}: LineItemDetailProps) {
  const { t } = useTranslation();
  const progress = qcTotal > 0 ? Math.round((qcDone / qcTotal) * 100) : 0;

  return (
    <main className="flex-1 min-w-0 bg-white overflow-y-auto">
      {/* Meta strip */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{chapterName}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{line.description}</h2>
          </div>
          {canCrud && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => alert(t('workspace.editLineComingSoon'))}
              className="gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('common.edit')}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('workspace.meta.quantity')}
            </div>
            <div className="text-sm nums font-medium mt-0.5">
              {line.quantity ?? '—'} {line.unit ?? ''}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('workspace.meta.unitPrice')}
            </div>
            <div className="text-sm nums font-medium mt-0.5">
              {line.unit_price != null ? formatCurrencyILS(line.unit_price) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('workspace.meta.total')}
            </div>
            <div className="text-sm nums font-medium mt-0.5 text-slate-900">
              {line.estimated_total != null ? formatCurrencyILS(line.estimated_total) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('workspace.meta.qcProgress')}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs nums font-medium">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as typeof activeTab)}
        variant="underline"
      >
        <div className="border-b border-slate-200 px-6 sticky top-0 bg-white z-10">
          <TabsList className="border-none">
            <TabsTrigger value="overview">
              <LayoutList />
              {t('workspace.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="qc" count={qcAttention > 0 ? qcAttention : undefined}>
              <ClipboardCheck />
              {t('workspace.tabs.qc')}
            </TabsTrigger>
            <TabsTrigger value="procurement" count={procurementCount > 0 ? procurementCount : undefined}>
              <Truck />
              {t('workspace.tabs.procurement')}
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ListChecks />
              {t('workspace.tabs.tasks')}
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="px-6 py-5">
          <TabsContent value="overview">
            <OverviewTab lineId={line.id} notes={line.notes} />
          </TabsContent>
          <TabsContent value="qc">
            <QcTab lineId={line.id} canCrud={canCrud} canComment={canComment} />
          </TabsContent>
          <TabsContent value="procurement">
            <ProcurementTab lineId={line.id} projectId={projectId} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksPlaceholderTab />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
