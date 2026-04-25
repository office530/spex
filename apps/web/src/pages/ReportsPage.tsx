import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  formatCurrencyILS,
  KpiTile,
  type IconTone,
} from '@spex/ui';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  FolderKanban,
  Inbox,
  Receipt,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
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

interface TopProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  contract_value: number | null;
  client: { company_name: string } | null;
}

interface RecentReceiptRow {
  id: string;
  amount: number;
  received_at: string;
  invoice: {
    project: { name: string } | null;
  } | null;
}

interface ReportData {
  activeContractValue: number;
  invoicedThisMonth: number;
  receivedThisMonth: number;
  outstanding: number;
  activeProjects: number;
  activeLeads: number;
  wonLast30: number;
  openTickets: number;
  projectsByStatus: Record<ProjectStatus, number>;
  leadsByStatus: Record<LeadStatus, number>;
  topProjects: TopProjectRow[];
  recentReceipts: RecentReceiptRow[];
}

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed', 'cancelled'];
const LEAD_STATUSES: LeadStatus[] = [
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

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        activeContractsRes,
        invoicedRes,
        receivedRes,
        outstandingRes,
        projsByStatusRes,
        leadsAllRes,
        wonLast30Res,
        openTicketsRes,
        topProjectsRes,
        recentReceiptsRes,
      ] = await Promise.all([
        supabase.from('projects').select('contract_value').eq('status', 'active'),
        supabase
          .from('customer_invoices')
          .select('amount')
          .gte('issued_at', monthStart)
          .in('status', ['issued', 'paid', 'overdue']),
        supabase.from('customer_receipts').select('amount').gte('received_at', monthStart),
        supabase
          .from('customer_invoices')
          .select('amount')
          .in('status', ['issued', 'overdue']),
        supabase.from('projects').select('status'),
        supabase.from('leads').select('status'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'won')
          .gte('updated_at', thirtyDaysAgo),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase
          .from('projects')
          .select(
            'id, name, status, contract_value, client:clients(company_name)',
          )
          .eq('status', 'active')
          .order('contract_value', { ascending: false, nullsFirst: false })
          .limit(5),
        supabase
          .from('customer_receipts')
          .select(
            'id, amount, received_at, invoice:customer_invoices(project:projects(name))',
          )
          .order('received_at', { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      if (activeContractsRes.error) setError(activeContractsRes.error.message);

      const sumAmount = <T extends { amount: number | null }>(rows: T[] | null): number =>
        (rows ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const sumContract = (
        rows: Array<{ contract_value: number | null }> | null,
      ): number => (rows ?? []).reduce((s, r) => s + (r.contract_value ?? 0), 0);

      const projStatuses = (projsByStatusRes.data as Array<{ status: ProjectStatus }> | null) ?? [];
      const projBuckets = PROJECT_STATUSES.reduce(
        (acc, s) => ({ ...acc, [s]: 0 }),
        {} as Record<ProjectStatus, number>,
      );
      projStatuses.forEach((r) => {
        projBuckets[r.status] = (projBuckets[r.status] ?? 0) + 1;
      });

      const leadStatuses = (leadsAllRes.data as Array<{ status: LeadStatus }> | null) ?? [];
      const leadBuckets = LEAD_STATUSES.reduce(
        (acc, s) => ({ ...acc, [s]: 0 }),
        {} as Record<LeadStatus, number>,
      );
      leadStatuses.forEach((r) => {
        leadBuckets[r.status] = (leadBuckets[r.status] ?? 0) + 1;
      });

      setData({
        activeContractValue: sumContract(
          activeContractsRes.data as Array<{ contract_value: number | null }> | null,
        ),
        invoicedThisMonth: sumAmount(invoicedRes.data as Array<{ amount: number | null }> | null),
        receivedThisMonth: sumAmount(
          receivedRes.data as Array<{ amount: number | null }> | null,
        ),
        outstanding: sumAmount(outstandingRes.data as Array<{ amount: number | null }> | null),
        activeProjects: projBuckets.active,
        activeLeads: leadStatuses.filter(
          (r) => r.status !== 'won' && r.status !== 'lost' && r.status !== 'not_relevant',
        ).length,
        wonLast30: wonLast30Res.count ?? 0,
        openTickets: openTicketsRes.count ?? 0,
        projectsByStatus: projBuckets,
        leadsByStatus: leadBuckets,
        topProjects: (topProjectsRes.data as unknown as TopProjectRow[]) ?? [],
        recentReceipts: (recentReceiptsRes.data as unknown as RecentReceiptRow[]) ?? [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  const tiles: Array<{
    label: string;
    icon: LucideIcon;
    iconTone: IconTone;
    value: string | number | undefined;
    numericValue?: number;
    format?: (n: number) => string;
  }> = [
    {
      label: t('reports.activeContractValue'),
      icon: CircleDollarSign,
      iconTone: 'success',
      value: data ? formatCurrencyILS(data.activeContractValue) : undefined,
      numericValue: data?.activeContractValue,
      format: (n) => formatCurrencyILS(n),
    },
    {
      label: t('reports.invoicedThisMonth'),
      icon: Receipt,
      iconTone: 'info',
      value: data ? formatCurrencyILS(data.invoicedThisMonth) : undefined,
      numericValue: data?.invoicedThisMonth,
      format: (n) => formatCurrencyILS(n),
    },
    {
      label: t('reports.receivedThisMonth'),
      icon: Banknote,
      iconTone: 'success',
      value: data ? formatCurrencyILS(data.receivedThisMonth) : undefined,
      numericValue: data?.receivedThisMonth,
      format: (n) => formatCurrencyILS(n),
    },
    {
      label: t('reports.outstanding'),
      icon: AlertCircle,
      iconTone: 'warning',
      value: data ? formatCurrencyILS(data.outstanding) : undefined,
      numericValue: data?.outstanding,
      format: (n) => formatCurrencyILS(n),
    },
    {
      label: t('reports.activeProjects'),
      icon: FolderKanban,
      iconTone: 'info',
      value: data?.activeProjects,
      numericValue: data?.activeProjects,
      format: (n) => Math.round(n).toLocaleString(),
    },
    {
      label: t('reports.activeLeads'),
      icon: Target,
      iconTone: 'accent',
      value: data?.activeLeads,
      numericValue: data?.activeLeads,
      format: (n) => Math.round(n).toLocaleString(),
    },
    {
      label: t('reports.wonLast30'),
      icon: CheckCircle2,
      iconTone: 'success',
      value: data?.wonLast30,
      numericValue: data?.wonLast30,
      format: (n) => Math.round(n).toLocaleString(),
    },
    {
      label: t('reports.openTickets'),
      icon: Inbox,
      iconTone: 'warning',
      value: data?.openTickets,
      numericValue: data?.openTickets,
      format: (n) => Math.round(n).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t('reports.subtitle')}</p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <KpiTile
            key={tile.label}
            icon={tile.icon}
            iconTone={tile.iconTone}
            label={tile.label}
            value={tile.value}
            numericValue={tile.numericValue}
            format={tile.format}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.projectsByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut
              loading={!data}
              chartData={
                data
                  ? PROJECT_STATUSES.map((s) => ({
                      name: t(`projects.status.${s}`),
                      value: data.projectsByStatus[s] ?? 0,
                    })).filter((d) => d.value > 0)
                  : []
              }
              palette={['#10b981', '#f59e0b', '#94a3b8', '#f43f5e']}
              loadingLabel={t('common.loading')}
              emptyLabel={t('reports.noData')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.leadsByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut
              loading={!data}
              chartData={
                data
                  ? LEAD_STATUSES.map((s) => ({
                      name: t(`leads.status.${s}`),
                      value: data.leadsByStatus[s] ?? 0,
                    })).filter((d) => d.value > 0)
                  : []
              }
              palette={[
                '#3b82f6',
                '#f59e0b',
                '#f97316',
                '#ef4444',
                '#8b5cf6',
                '#6366f1',
                '#06b6d4',
                '#14b8a6',
                '#84cc16',
                '#10b981',
                '#f43f5e',
                '#94a3b8',
              ]}
              loadingLabel={t('common.loading')}
              emptyLabel={t('reports.noData')}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.topProjects')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data ? (
              data.topProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">
                  {t('reports.noData')}
                </p>
              ) : (
                <div className="divide-y">
                  {data.topProjects.map((p) => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center justify-between px-6 py-3 gap-4 hover:bg-muted/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.client?.company_name ?? '—'}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-medium">
                        {p.contract_value != null ? formatCurrencyILS(p.contract_value) : '—'}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.recentReceipts')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data ? (
              data.recentReceipts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">
                  {t('reports.noData')}
                </p>
              ) : (
                <div className="divide-y">
                  {data.recentReceipts.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-6 py-3 gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {r.invoice?.project?.name ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dateFmt.format(new Date(r.received_at))}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-medium">
                        {formatCurrencyILS(r.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatusDonutProps {
  chartData: Array<{ name: string; value: number }>;
  palette: string[];
  loading: boolean;
  loadingLabel: string;
  emptyLabel: string;
}

function StatusDonut({ chartData, palette, loading, loadingLabel, emptyLabel }: StatusDonutProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground p-6 text-center">{loadingLabel}</p>;
  }
  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground p-6 text-center">{emptyLabel}</p>;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid hsl(var(--border))',
              fontSize: '0.875rem',
            }}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
