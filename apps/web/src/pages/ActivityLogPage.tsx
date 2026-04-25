import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  SkeletonRows,
  StatusBadge,
} from '@spex/ui';
import { History } from 'lucide-react';
import { useEffect, useState } from 'react';
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
        .select('id, entity_type, entity_id, action, user_id, occurred_at, user:user_profiles(full_name)')
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

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('activityLog.title')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t('activityLog.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('activityLog.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <SkeletonRows count={8} />
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">{error}</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={History} title={t('activityLog.empty')} />
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const entityLabel = t(`activityLog.entity.${r.entity_type}`, {
                  defaultValue: r.entity_type,
                });
                const actionLabel = t(`activityLog.action.${r.action}`);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-6 py-3 gap-4 flex-wrap"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{r.user?.full_name ?? '—'}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span>{actionLabel}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="font-medium">{entityLabel}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {r.entity_id}
                      </div>
                    </div>
                    <StatusBadge
                      family="audit_action"
                      value={r.action}
                      label={actionLabel}
                      className="shrink-0"
                    />
                    <div className="text-xs text-muted-foreground shrink-0">
                      {dateFmt.format(new Date(r.occurred_at))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
