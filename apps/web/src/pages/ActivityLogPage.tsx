import {
  ActivityTimeline,
  ActivityTimelineGroup,
  ActivityTimelineItem,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  SkeletonRows,
  type TimelineIconTone,
} from '@spex/ui';
import { History, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

type Action = 'insert' | 'update' | 'delete';

interface ActivityRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: Action;
  user_id: string | null;
  occurred_at: string;
  user: { full_name: string } | null;
}

const ACTION_ICON: Record<Action, typeof Plus> = {
  insert: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_TONE: Record<Action, TimelineIconTone> = {
  insert: 'success',
  update: 'info',
  delete: 'danger',
};

function dateGroupKey(iso: string, locale: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'today';
  if (isSameDay(d, yesterday)) return 'yesterday';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}

export function ActivityLogPage() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: dbErr } = await supabase
        .from('activity_logs')
        .select(
          'id, entity_type, entity_id, action, user_id, occurred_at, user:user_profiles(full_name)',
        )
        .order('occurred_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (dbErr) setError(dbErr.message);
      else setRows((data as unknown as ActivityRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }),
    [i18n.language],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<string, ActivityRow[]>();
    for (const r of rows) {
      const key = dateGroupKey(r.occurred_at, i18n.language);
      const existing = buckets.get(key);
      if (existing) existing.push(r);
      else buckets.set(key, [r]);
    }
    return Array.from(buckets.entries());
  }, [rows, i18n.language]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('activityLog.title')} subtitle={t('activityLog.subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('activityLog.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonRows count={8} />
          ) : error ? (
            <p className="text-sm text-destructive p-2">{error}</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={History} title={t('activityLog.empty')} />
          ) : (
            <ActivityTimeline>
              {grouped.map(([groupKey, items]) => {
                const groupLabel =
                  groupKey === 'today'
                    ? t('common.today')
                    : groupKey === 'yesterday'
                      ? t('common.yesterday')
                      : groupKey;
                return (
                  <ActivityTimelineGroup key={groupKey} label={groupLabel}>
                    {items.map((r, idx) => {
                      const Icon = ACTION_ICON[r.action];
                      const entityLabel = t(`activityLog.entity.${r.entity_type}`, {
                        defaultValue: r.entity_type,
                      });
                      const actionLabel = t(`activityLog.action.${r.action}`);
                      return (
                        <ActivityTimelineItem
                          key={r.id}
                          icon={Icon}
                          iconTone={ACTION_TONE[r.action]}
                          last={idx === items.length - 1}
                          timestamp={timeFmt.format(new Date(r.occurred_at))}
                        >
                          <span className="font-medium">{r.user?.full_name ?? '—'}</span>
                          <span className="text-muted-foreground"> · </span>
                          <span>{actionLabel}</span>
                          <span className="text-muted-foreground"> · </span>
                          <span className="font-medium">{entityLabel}</span>
                        </ActivityTimelineItem>
                      );
                    })}
                  </ActivityTimelineGroup>
                );
              })}
            </ActivityTimeline>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
