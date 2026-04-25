import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@spex/ui';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { supabase } from '../../lib/supabase';

interface Milestone {
  id: string;
  name: string;
  billing_pct: number;
  sort_order: number;
  execution_status: 'pending' | 'in_progress' | 'done';
}

interface SchedulePanelProps {
  projectId: string;
  startDate: string | null;
  targetEndDate: string | null;
}

const VIEW_MODE_LABEL: Partial<Record<ViewMode, string>> = {
  [ViewMode.Day]: 'יום',
  [ViewMode.Week]: 'שבוע',
  [ViewMode.Month]: 'חודש',
};

function progressFor(execution: Milestone['execution_status']): number {
  if (execution === 'done') return 100;
  if (execution === 'in_progress') return 50;
  return 0;
}

export function SchedulePanel({ projectId, startDate, targetEndDate }: SchedulePanelProps) {
  const { t } = useTranslation();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>(ViewMode.Week);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('milestones')
        .select('id, name, billing_pct, sort_order, execution_status')
        .eq('project_id', projectId)
        .order('sort_order');
      if (cancelled) return;
      setMilestones((data as Milestone[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const tasks: GanttTask[] = useMemo(() => {
    if (milestones.length === 0) return [];
    const start = startDate ? new Date(startDate) : new Date();
    const end = targetEndDate
      ? new Date(targetEndDate)
      : new Date(start.getTime() + 90 * 86400000);
    const totalMs = Math.max(end.getTime() - start.getTime(), 86400000);
    const totalPct = milestones.reduce((s, m) => s + (m.billing_pct ?? 0), 0) || 100;

    let cursorMs = start.getTime();
    return milestones.map<GanttTask>((m) => {
      const slice = (m.billing_pct / totalPct) * totalMs;
      const segStart = new Date(cursorMs);
      const segEnd = new Date(cursorMs + slice);
      cursorMs += slice;
      return {
        id: m.id,
        name: m.name,
        type: 'task',
        start: segStart,
        end: segEnd,
        progress: progressFor(m.execution_status),
        styles: {
          backgroundColor:
            m.execution_status === 'done'
              ? '#10b981'
              : m.execution_status === 'in_progress'
                ? '#3b82f6'
                : '#94a3b8',
          backgroundSelectedColor: '#0d9488',
          progressColor: '#0f766e',
          progressSelectedColor: '#0f766e',
        },
        isDisabled: true,
      };
    });
  }, [milestones, startDate, targetEndDate]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t('schedule.title')}</CardTitle>
        <div className="inline-flex rounded-md border text-xs">
          {[ViewMode.Day, ViewMode.Week, ViewMode.Month].map((mode, i, arr) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`px-2 py-1 ${
                i === 0 ? 'rounded-s-md' : i === arr.length - 1 ? 'rounded-e-md' : ''
              } ${view === mode ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
            >
              {VIEW_MODE_LABEL[mode]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : tasks.length === 0 ? (
          <EmptyState icon={CalendarIcon} title={t('schedule.empty')} />
        ) : (
          <div className="overflow-auto" dir="ltr">
            <Gantt
              tasks={tasks}
              viewMode={view}
              listCellWidth=""
              columnWidth={view === ViewMode.Month ? 100 : view === ViewMode.Week ? 70 : 40}
              barCornerRadius={4}
              fontSize="12"
              todayColor="rgba(15, 118, 110, 0.15)"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
