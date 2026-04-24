import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@spex/ui';
import { BellRing } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

type Channel = 'in_app' | 'email' | 'whatsapp';

const CHANNELS: Channel[] = ['in_app', 'email', 'whatsapp'];

interface PreferenceRow {
  event_type: string;
  channel: Channel;
  enabled: boolean;
}

// in_app defaults ON, other channels default OFF. This matches the
// UX: if a pref row is missing, treat in_app as enabled.
function defaultFor(channel: Channel): boolean {
  return channel === 'in_app';
}

export function NotificationPreferencesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<PreferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    const [rulesRes, prefsRes] = await Promise.all([
      supabase
        .from('automation_rules')
        .select('trigger_event')
        .order('trigger_event'),
      supabase
        .from('notification_preferences')
        .select('event_type, channel, enabled')
        .eq('user_id', user.id),
    ]);
    if (rulesRes.error) setError(rulesRes.error.message);
    else {
      const unique = Array.from(
        new Set(((rulesRes.data as Array<{ trigger_event: string }>) ?? []).map((r) => r.trigger_event)),
      );
      setEventTypes(unique);
    }
    if (prefsRes.error) setError(prefsRes.error.message);
    else setPrefs((prefsRes.data as PreferenceRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const byKey = useMemo(() => {
    const map = new Map<string, boolean>();
    prefs.forEach((p) => map.set(`${p.event_type}|${p.channel}`, p.enabled));
    return map;
  }, [prefs]);

  async function toggle(eventType: string, channel: Channel) {
    if (!user) return;
    const current = byKey.get(`${eventType}|${channel}`) ?? defaultFor(channel);
    const next = !current;
    const previous = prefs;
    // Optimistic
    setPrefs((old) => {
      const without = old.filter((p) => !(p.event_type === eventType && p.channel === channel));
      return [...without, { event_type: eventType, channel, enabled: next }];
    });
    const { error: dbErr } = await supabase.from('notification_preferences').upsert(
      {
        user_id: user.id,
        event_type: eventType,
        channel,
        enabled: next,
      },
      { onConflict: 'user_id,event_type,channel' },
    );
    if (dbErr) {
      setError(dbErr.message);
      setPrefs(previous);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('settings.notifications.description')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.notifications.title')}</CardTitle>
          <CardDescription>{t('settings.notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="text-sm text-destructive p-6" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
          ) : eventTypes.length === 0 ? (
            <EmptyState icon={BellRing} title={t('settings.notifications.empty')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-start px-4 py-2 text-xs font-medium text-muted-foreground">
                      {t('settings.notifications.event')}
                    </th>
                    {CHANNELS.map((c) => (
                      <th
                        key={c}
                        className="px-4 py-2 text-xs font-medium text-muted-foreground text-center w-28"
                      >
                        {t(`settings.notifications.channels.${c}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventTypes.map((ev) => (
                    <tr key={ev} className="border-b">
                      <td className="px-4 py-3 font-mono text-xs">{ev}</td>
                      {CHANNELS.map((c) => {
                        const enabled = byKey.get(`${ev}|${c}`) ?? defaultFor(c);
                        return (
                          <td key={c} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => void toggle(ev, c)}
                              className="h-4 w-4 rounded border-input"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
