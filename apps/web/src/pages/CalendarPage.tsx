import { Button, Card, CardContent } from '@spex/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type EventStatus = 'scheduled' | 'cancelled' | 'no_show';

interface EventRow {
  id: string;
  title: string;
  status: EventStatus;
  scheduled_at: string;
  duration_minutes: number | null;
  lead_id: string | null;
  project_id: string | null;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const from = startOfMonth(cursor).toISOString();
      const to = endOfMonth(cursor).toISOString();
      const { data, error: dbErr } = await supabase
        .from('events')
        .select('id, title, status, scheduled_at, duration_minutes, lead_id, project_id')
        .gte('scheduled_at', from)
        .lte('scheduled_at', to)
        .order('scheduled_at');
      if (cancelled) return;
      if (dbErr) setError(dbErr.message);
      else setEvents((data as EventRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cursor]);

  const { weeks, weekdayLabels, monthLabel } = useMemo(() => {
    const first = startOfMonth(cursor);
    // Start on Sunday (day 0)
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    const daysArr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      daysArr.push(d);
    }
    const weeksArr: Date[][] = [];
    for (let i = 0; i < 6; i++) {
      weeksArr.push(daysArr.slice(i * 7, i * 7 + 7));
    }
    const weekdayFmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    const labels: string[] = [];
    const ref = new Date(2024, 0, 7); // A Sunday
    for (let i = 0; i < 7; i++) {
      const d = new Date(ref);
      d.setDate(ref.getDate() + i);
      labels.push(weekdayFmt.format(d));
    }
    const monthFmt = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' });
    return { weeks: weeksArr, weekdayLabels: labels, monthLabel: monthFmt.format(cursor) };
  }, [cursor, i18n.language]);

  const timeFmt = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            {t('calendar.today')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(addMonths(cursor, -1))}
            aria-label={t('calendar.prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label={t('calendar.next')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            {weekdayLabels.map((label) => (
              <div key={label} className="px-2 py-2 text-center">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flat().map((day, i) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = day.getTime() === today.getTime();
              const dayEvents = events.filter((e) => {
                const d = new Date(e.scheduled_at);
                return (
                  d.getFullYear() === day.getFullYear() &&
                  d.getMonth() === day.getMonth() &&
                  d.getDate() === day.getDate()
                );
              });
              return (
                <div
                  key={i}
                  className={`min-h-[88px] border-b border-s p-1.5 ${
                    inMonth ? '' : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div
                    className={`text-xs mb-1 ${
                      isToday
                        ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold'
                        : ''
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const dest = ev.lead_id
                        ? `/leads/${ev.lead_id}`
                        : ev.project_id
                          ? `/projects/${ev.project_id}`
                          : null;
                      const chip = (
                        <div className="text-[11px] rounded px-1.5 py-0.5 truncate bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
                          <span className="me-1 font-medium">
                            {timeFmt.format(new Date(ev.scheduled_at))}
                          </span>
                          {ev.title}
                        </div>
                      );
                      return dest ? (
                        <Link key={ev.id} to={dest} className="block">
                          {chip}
                        </Link>
                      ) : (
                        <div key={ev.id}>{chip}</div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground ps-1.5">
                        +{dayEvents.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {loading && (
            <p className="text-xs text-muted-foreground p-3 text-center">{t('common.loading')}</p>
          )}
          {!loading && events.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 text-center">{t('calendar.noEvents')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
