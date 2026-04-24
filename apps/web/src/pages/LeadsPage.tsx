import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@spex/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type LeadStatus =
  | 'new'
  | 'no_answer_1'
  | 'no_answer_2'
  | 'no_answer_3'
  | 'follow_up'
  | 'planning_meeting_scheduled'
  | 'awaiting_plans'
  | 'quote_issued'
  | 'work_meeting_scheduled'
  | 'won'
  | 'lost'
  | 'not_relevant';

type LeadSource = 'website' | 'fb_ads' | 'referral' | 'manual';

const ALL_STATUSES: LeadStatus[] = [
  'new',
  'no_answer_1',
  'no_answer_2',
  'no_answer_3',
  'follow_up',
  'planning_meeting_scheduled',
  'awaiting_plans',
  'quote_issued',
  'work_meeting_scheduled',
  'won',
  'lost',
  'not_relevant',
];

const statusBadgeClass: Record<LeadStatus, string> = {
  new: 'bg-sky-100 text-sky-800',
  no_answer_1: 'bg-amber-100 text-amber-800',
  no_answer_2: 'bg-amber-100 text-amber-800',
  no_answer_3: 'bg-amber-200 text-amber-900',
  follow_up: 'bg-violet-100 text-violet-800',
  planning_meeting_scheduled: 'bg-indigo-100 text-indigo-800',
  awaiting_plans: 'bg-indigo-100 text-indigo-800',
  quote_issued: 'bg-teal-100 text-teal-800',
  work_meeting_scheduled: 'bg-emerald-100 text-emerald-800',
  won: 'bg-emerald-200 text-emerald-900',
  lost: 'bg-rose-100 text-rose-800',
  not_relevant: 'bg-slate-200 text-slate-700',
};

interface LeadRow {
  id: string;
  full_name: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  owner: { full_name: string } | null;
}

export function LeadsPage() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name, phone, status, source, owner:user_profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setLeads((data as unknown as LeadRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.full_name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.owner?.full_name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [leads, query, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('leads.title')}</h1>
        <Button asChild>
          <Link to="/leads/new">{t('leads.new')}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('leads.listTitle')}</CardTitle>
          <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
            <Input
              placeholder={t('leads.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{t('leads.allStatuses')}</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`leads.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              {t('common.loading')}
            </p>
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">
              {query || statusFilter ? t('leads.noMatches') : t('leads.empty')}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((l) => (
                <Link
                  key={l.id}
                  to={`/leads/${l.id}`}
                  className="flex items-center justify-between px-6 py-3 gap-4 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.phone}
                      <span> · {t(`leads.source.${l.source}`)}</span>
                      {l.owner && <span> · {l.owner.full_name}</span>}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[l.status]}`}
                  >
                    {t(`leads.status.${l.status}`)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
