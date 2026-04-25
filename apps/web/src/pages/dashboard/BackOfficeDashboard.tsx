import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatCurrencyILS,
  KpiTile,
  SkeletonRows,
  StatusBadge,
  type IconTone,
} from '@spex/ui';
import {
  AlarmClock,
  Building2,
  CheckSquare,
  FolderKanban,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

interface AggregateKpis {
  openAr: number;
  overdueArSum: number;
  overdueCount: number;
  activeProjects: number;
  pendingApprovals: number;
}

interface RecentProject {
  id: string;
  name: string;
  status: ProjectStatus;
  contract_value: number | null;
  client: { company_name: string } | null;
  pm: { full_name: string } | null;
}

interface OverdueInvoice {
  id: string;
  amount: number;
  due_date: string | null;
  status: string;
  project: { id: string; name: string; client: { company_name: string } | null } | null;
}

const OPEN_INVOICE_STATUSES = ['issued', 'overdue'];

export function BackOfficeDashboard() {
  const { t, i18n } = useTranslation();
  const [kpis, setKpis] = useState<AggregateKpis | null>(null);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [overdue, setOverdue] = useState<OverdueInvoice[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [
        invoicesOpen,
        invoicesOverdue,
        projActive,
        prPending,
        recentProj,
        overdueRows,
      ] = await Promise.all([
        supabase
          .from('customer_invoices')
          .select('amount')
          .in('status', OPEN_INVOICE_STATUSES),
        supabase
          .from('customer_invoices')
          .select('id, amount')
          .eq('status', 'overdue'),
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('payment_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pm_approved_awaiting_back_office'),
        supabase
          .from('projects')
          .select(
            'id, name, status, contract_value, client:clients(company_name), pm:user_profiles!projects_pm_id_fkey(full_name)',
          )
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('customer_invoices')
          .select(
            'id, amount, due_date, status, project:projects(id, name, client:clients(company_name))',
          )
          .eq('status', 'overdue')
          .order('due_date', { ascending: true })
          .limit(5),
      ]);

      if (cancelled) return;

      const openSum = ((invoicesOpen.data ?? []) as Array<{ amount: number }>).reduce(
        (acc, r) => acc + (r.amount ?? 0),
        0,
      );
      const overdueSum = ((invoicesOverdue.data ?? []) as Array<{ amount: number }>).reduce(
        (acc, r) => acc + (r.amount ?? 0),
        0,
      );

      setKpis({
        openAr: openSum,
        overdueArSum: overdueSum,
        overdueCount: invoicesOverdue.data?.length ?? 0,
        activeProjects: projActive.count ?? 0,
        pendingApprovals: prPending.count ?? 0,
      });
      setRecent((recentProj.data as unknown as RecentProject[]) ?? []);
      setOverdue((overdueRows.data as unknown as OverdueInvoice[]) ?? []);

      // Suppress unused var lint for `today`; reserved for future range filter.
      void today;
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
    value: string;
    footer?: string;
    to: string;
    danger?: boolean;
  }> = [
    {
      label: t('dashboard.openAr'),
      icon: TrendingUp,
      iconTone: 'success',
      value: kpis ? formatCurrencyILS(kpis.openAr) : '—',
      to: '/financials',
    },
    {
      label: t('dashboard.overdueAr'),
      icon: AlarmClock,
      iconTone: 'danger',
      value: kpis ? formatCurrencyILS(kpis.overdueArSum) : '—',
      footer: kpis
        ? t('dashboard.invoicesCount', { count: kpis.overdueCount })
        : undefined,
      to: '/financials',
      danger: true,
    },
    {
      label: t('dashboard.pendingApprovals'),
      icon: CheckSquare,
      iconTone: 'warning',
      value: kpis ? String(kpis.pendingApprovals) : '—',
      footer: t('dashboard.paymentRequestsAwaitingApproval'),
      to: '/projects',
    },
    {
      label: t('dashboard.activeProjects'),
      icon: FolderKanban,
      iconTone: 'info',
      value: kpis ? String(kpis.activeProjects) : '—',
      to: '/projects',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.titleBackOffice')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('dashboard.subtitleBackOffice')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            to={tile.to}
            className="block transition-transform hover:-translate-y-0.5"
          >
            <KpiTile
              icon={tile.icon}
              iconTone={tile.iconTone}
              label={tile.label}
              value={tile.value}
              footer={tile.footer}
              highlight={tile.danger}
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t('dashboard.recentProjects')}</CardTitle>
            <Link to="/projects" className="text-xs text-primary font-medium hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {kpis === null ? (
              <SkeletonRows count={4} />
            ) : recent.length === 0 ? (
              <EmptyState icon={Building2} title={t('dashboard.noRecentProjects')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 p-4">
                {recent.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="rounded-lg border bg-background hover:border-primary/50 hover:shadow-sm p-4 space-y-2 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.client?.company_name ?? '—'}
                        </div>
                      </div>
                      <StatusBadge
                        family="project"
                        value={p.status}
                        label={t(`projects.status.${p.status}`)}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground truncate">
                        {p.pm?.full_name ?? t('projects.noPm')}
                      </div>
                      {p.contract_value != null && (
                        <div className="text-sm font-medium shrink-0">
                          {formatCurrencyILS(p.contract_value)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-rose-700" />
              {t('dashboard.overdueInvoicesTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {kpis === null ? (
              <SkeletonRows count={3} />
            ) : overdue.length === 0 ? (
              <EmptyState icon={Receipt} title={t('dashboard.noOverdue')} />
            ) : (
              <div className="divide-y">
                {overdue.map((inv) => (
                  <Link
                    key={inv.id}
                    to={inv.project ? `/projects/${inv.project.id}` : '/projects'}
                    className="block px-4 py-3 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {inv.project?.name ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {inv.project?.client?.company_name ?? '—'}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-rose-700 shrink-0">
                        {formatCurrencyILS(inv.amount)}
                      </div>
                    </div>
                    {inv.due_date && (
                      <div className="text-xs text-rose-600 mt-1">
                        {t('dashboard.dueOn', {
                          date: dateFmt.format(new Date(inv.due_date)),
                        })}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
