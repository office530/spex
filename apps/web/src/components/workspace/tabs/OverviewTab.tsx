import {
  ActivityTimeline,
  ActivityTimelineItem,
  EmptyState,
  SkeletonRows,
} from '@spex/ui';
import { Check, FileText, History, Receipt, ThumbsUp, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';

type Action = 'insert' | 'update' | 'delete';

interface ActivityRow {
  id: string;
  action: Action;
  entity_type: string;
  occurred_at: string;
  user: { full_name: string } | null;
}

interface OverviewTabProps {
  lineId: string;
  notes: string | null;
}

const ACTION_ICON: Record<Action, typeof Check> = {
  insert: ThumbsUp,
  update: History,
  delete: Upload,
};

export function OverviewTab({ lineId, notes }: OverviewTabProps) {
  const { t, i18n } = useTranslation();
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Pull recent activity entries that mention this line item via entity_id.
      // ActivityLog (Phase 37) is generic — entity_type='boq_line_items', entity_id=:lineId.
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action, entity_type, occurred_at, user:user_profiles(full_name)')
        .eq('entity_id', lineId)
        .order('occurred_at', { ascending: false })
        .limit(5);
      if (cancelled) return;
      setActivity((data as unknown as ActivityRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [lineId]);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }),
    [i18n.language],
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          {t('workspace.overview.notes')}
        </div>
        {notes ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {notes}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t('workspace.overview.noNotes')}
          </p>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-slate-500" />
          {t('workspace.overview.activity')}
        </div>
        {activity === null ? (
          <SkeletonRows count={3} />
        ) : activity.length === 0 ? (
          <EmptyState icon={Receipt} title={t('workspace.overview.noActivity')} />
        ) : (
          <ActivityTimeline>
            {activity.map((a, idx) => {
              const Icon = ACTION_ICON[a.action];
              const tone = a.action === 'delete' ? 'danger' : a.action === 'insert' ? 'success' : 'info';
              return (
                <ActivityTimelineItem
                  key={a.id}
                  icon={Icon}
                  iconTone={tone}
                  last={idx === activity.length - 1}
                  timestamp={timeFmt.format(new Date(a.occurred_at))}
                >
                  <span className="font-medium">{a.user?.full_name ?? '—'}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span>{t(`activityLog.action.${a.action}`)}</span>
                </ActivityTimelineItem>
              );
            })}
          </ActivityTimeline>
        )}
      </div>
    </div>
  );
}
