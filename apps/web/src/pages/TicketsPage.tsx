import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  StatusBadge,
} from '@spex/ui';
import { Inbox } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type TicketStatus =
  | 'new'
  | 'in_progress'
  | 'awaiting_manager'
  | 'resolved'
  | 'cancelled';

type OpenerType = 'client' | 'manager' | 'anonymous';

const ALL_STATUSES: TicketStatus[] = [
  'new',
  'in_progress',
  'awaiting_manager',
  'resolved',
  'cancelled',
];

interface TicketRow {
  id: string;
  subject: string;
  opener_type: OpenerType;
  opener_name: string | null;
  status: TicketStatus;
  project: { name: string } | null;
  assignee: { full_name: string } | null;
  created_at: string;
}

export function TicketsPage() {
  const { t, i18n } = useTranslation();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(
          'id, subject, opener_type, opener_name, status, created_at, project:projects(name), assignee:user_profiles(full_name)',
        )
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setTickets((data as unknown as TicketRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((tk) => {
      if (statusFilter && tk.status !== statusFilter) return false;
      if (!q) return true;
      return (
        tk.subject.toLowerCase().includes(q) ||
        (tk.opener_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tickets, query, statusFilter]);

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('tickets.title')}</h1>
        <Button asChild>
          <Link to="/tickets/new">{t('tickets.new')}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('tickets.listTitle')}</CardTitle>
          <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
            <Input
              placeholder={t('tickets.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{t('tickets.allStatuses')}</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`tickets.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">{error}</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={query || statusFilter ? t('tickets.noMatches') : t('tickets.empty')}
            />
          ) : (
            <div className="divide-y">
              {filtered.map((tk) => (
                <Link
                  key={tk.id}
                  to={`/tickets/${tk.id}`}
                  className="flex items-center justify-between px-6 py-3 gap-4 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{tk.subject}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t(`tickets.opener.${tk.opener_type}`)}
                      {tk.opener_name && <span> · {tk.opener_name}</span>}
                      {tk.project && <span> · {tk.project.name}</span>}
                      <span> · {dateFmt.format(new Date(tk.created_at))}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground hidden sm:block">
                    {tk.assignee?.full_name ?? t('tickets.unassigned')}
                  </div>
                  <StatusBadge
                    family="ticket"
                    value={tk.status}
                    label={t(`tickets.status.${tk.status}`)}
                    className="shrink-0"
                  />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
