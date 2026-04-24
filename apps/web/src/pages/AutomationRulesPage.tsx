import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@spex/ui';
import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface AutomationActions {
  channel?: string;
  template?: string;
  recipient?: string;
}

interface RuleRow {
  id: string;
  name: string;
  trigger_event: string;
  actions: AutomationActions | null;
  is_active: boolean;
}

export function AutomationRulesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error: dbErr } = await supabase
      .from('automation_rules')
      .select('id, name, trigger_event, actions, is_active')
      .order('trigger_event')
      .order('name');
    if (dbErr) setError(dbErr.message);
    else setRows((data as RuleRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function toggle(row: RuleRow) {
    const { error: dbErr } = await supabase
      .from('automation_rules')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    if (dbErr) setError(dbErr.message);
    else await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('settings.automations.description')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.automations.title')}</CardTitle>
          <CardDescription>{t('settings.automations.description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="text-sm text-destructive p-6" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={Zap} title={t('settings.automations.empty')} />
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-4 px-6 py-3 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground space-x-2 rtl:space-x-reverse">
                      <span className="font-mono">{r.trigger_event}</span>
                      {r.actions?.channel && (
                        <span>· {t('settings.automations.channelLabel')}: {r.actions.channel}</span>
                      )}
                      {r.actions?.template && (
                        <span>· {t('settings.automations.templateLabel')}: {r.actions.template}</span>
                      )}
                      {r.actions?.recipient && (
                        <span>· {t('settings.automations.recipientLabel')}: {r.actions.recipient}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {r.is_active
                      ? t('settings.automations.active')
                      : t('settings.automations.inactive')}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => void toggle(r)}>
                    {r.is_active
                      ? t('settings.automations.toggleOff')
                      : t('settings.automations.toggleOn')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
