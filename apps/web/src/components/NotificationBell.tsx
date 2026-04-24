import { Button } from '@spex/ui';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_to: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, kind, title, body, link_to, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setRows((data as NotificationRow[]) ?? []);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = rows.filter((r) => !r.read_at).length;
  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  async function markAllRead() {
    if (!user) return;
    const now = new Date().toISOString();
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null);
    await refresh();
  }

  async function activate(row: NotificationRow) {
    if (!row.read_at) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', row.id);
    }
    setOpen(false);
    if (row.link_to) navigate(row.link_to);
    void refresh();
  }

  return (
    <div ref={popoverRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="relative h-8 w-8 p-0 text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
        aria-label={t('notifications.title')}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute bottom-full start-0 mb-2 z-20 w-80 rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b">
            <div className="text-sm font-semibold">{t('notifications.title')}</div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {t('notifications.empty')}
              </p>
            ) : (
              rows.map((r) => {
                const kindLabel = t(`notifications.kind.${r.kind}`, {
                  defaultValue: r.kind,
                });
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => void activate(r)}
                    className={`block w-full text-start px-4 py-3 hover:bg-muted/60 transition-colors ${
                      r.read_at ? '' : 'bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!r.read_at && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">{kindLabel}</div>
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        {r.body && (
                          <p className="text-xs text-muted-foreground truncate">{r.body}</p>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {dateFmt.format(new Date(r.created_at))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
