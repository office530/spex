import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatCurrencyILS,
  KpiTile,
  PageHeader,
  SkeletonRows,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type IconTone,
} from '@spex/ui';
import {
  AlarmClock,
  CalendarDays,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface InvoiceRow {
  id: string;
  amount: number;
  due_date: string | null;
  status: string;
  project: { id: string; name: string; client: { company_name: string } | null } | null;
}

interface SupplierInvoice {
  id: string;
  amount: number;
  project: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
}

interface PendingPayment {
  id: string;
  amount: number;
  status: string;
  supplier_invoice: {
    supplier: { id: string; name: string } | null;
    project: { id: string; name: string } | null;
  } | null;
}

const OPEN_INVOICE_STATUSES = ['issued', 'overdue'];
const UNPAID_SUPPLIER_INVOICE_STATUSES = ['received', 'matched', 'disputed'];

interface AgingBuckets {
  current: number;   // 0–30
  past30: number;    // 31–60
  past60: number;    // 61+
}

function bucketise(invoices: InvoiceRow[], todayMs: number): AgingBuckets {
  const buckets: AgingBuckets = { current: 0, past30: 0, past60: 0 };
  for (const inv of invoices) {
    if (!inv.due_date) {
      buckets.current += inv.amount;
      continue;
    }
    const days = Math.floor((todayMs - new Date(inv.due_date).getTime()) / 86_400_000);
    if (days <= 30) buckets.current += inv.amount;
    else if (days <= 60) buckets.past30 += inv.amount;
    else buckets.past60 += inv.amount;
  }
  return buckets;
}

export function FinancialsPage() {
  const { t, i18n } = useTranslation();
  const [openInvoices, setOpenInvoices] = useState<InvoiceRow[] | null>(null);
  const [unpaidSuppliers, setUnpaidSuppliers] = useState<SupplierInvoice[] | null>(null);
  const [pending, setPending] = useState<PendingPayment[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [invRes, supRes, prRes] = await Promise.all([
        supabase
          .from('customer_invoices')
          .select(
            'id, amount, due_date, status, project:projects(id, name, client:clients(company_name))',
          )
          .in('status', OPEN_INVOICE_STATUSES)
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('supplier_invoices')
          .select(
            'id, amount, project:projects(id, name), supplier:suppliers(id, name)',
          )
          .in('status', UNPAID_SUPPLIER_INVOICE_STATUSES),
        supabase
          .from('payment_requests')
          .select(
            'id, amount, status, supplier_invoice:supplier_invoices(supplier:suppliers(id, name), project:projects(id, name))',
          )
          .eq('status', 'pm_approved_awaiting_back_office')
          .order('created_at', { ascending: true })
          .limit(15),
      ]);
      if (cancelled) return;
      setOpenInvoices((invRes.data as unknown as InvoiceRow[]) ?? []);
      setUnpaidSuppliers((supRes.data as unknown as SupplierInvoice[]) ?? []);
      setPending((prRes.data as unknown as PendingPayment[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayMs = useMemo(() => Date.now(), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const openSum = (openInvoices ?? []).reduce((acc, r) => acc + (r.amount ?? 0), 0);
  const overdueRows = (openInvoices ?? []).filter(
    (r) => r.status === 'overdue' || (r.due_date && r.due_date < today),
  );
  const overdueSum = overdueRows.reduce((acc, r) => acc + (r.amount ?? 0), 0);
  const unpaidSupplierSum = (unpaidSuppliers ?? []).reduce(
    (acc, r) => acc + (r.amount ?? 0),
    0,
  );
  const cashPosition = openSum - unpaidSupplierSum;
  const pendingSum = (pending ?? []).reduce((acc, r) => acc + (r.amount ?? 0), 0);

  const aging = bucketise(openInvoices ?? [], todayMs);

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' });

  const tiles: Array<{
    label: string;
    icon: LucideIcon;
    iconTone: IconTone;
    value: string;
    footer?: string;
    danger?: boolean;
  }> = [
    {
      label: t('financials.totalAr'),
      icon: TrendingUp,
      iconTone: 'success',
      value: openInvoices === null ? '—' : formatCurrencyILS(openSum),
      footer: openInvoices ? t('financials.invoicesCount', { count: openInvoices.length }) : undefined,
    },
    {
      label: t('financials.overdueAr'),
      icon: AlarmClock,
      iconTone: 'danger',
      value: openInvoices === null ? '—' : formatCurrencyILS(overdueSum),
      footer: openInvoices
        ? t('financials.invoicesCount', { count: overdueRows.length })
        : undefined,
      danger: overdueRows.length > 0,
    },
    {
      label: t('financials.cashPosition'),
      icon: Wallet,
      iconTone: cashPosition >= 0 ? 'info' : 'warning',
      value: openInvoices === null || unpaidSuppliers === null
        ? '—'
        : formatCurrencyILS(cashPosition),
      footer: t('financials.arMinusAp'),
    },
    {
      label: t('financials.pendingPayouts'),
      icon: TrendingDown,
      iconTone: 'warning',
      value: pending === null ? '—' : formatCurrencyILS(pendingSum),
      footer: pending
        ? t('financials.requestsCount', { count: pending.length })
        : undefined,
    },
  ];

  const agingData = [
    { name: t('financials.aging.current'), value: aging.current, color: '#10b981' },
    { name: t('financials.aging.past30'), value: aging.past30, color: '#f59e0b' },
    { name: t('financials.aging.past60'), value: aging.past60, color: '#e11d48' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t('financials.title')} subtitle={t('financials.subtitle')} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <KpiTile
            key={tile.label}
            icon={tile.icon}
            iconTone={tile.iconTone}
            label={tile.label}
            value={tile.value}
            footer={tile.footer}
            highlight={tile.danger}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t('financials.overdueTitle')}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {openInvoices === null
                ? ''
                : t('financials.invoicesCount', { count: overdueRows.length })}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {openInvoices === null ? (
              <SkeletonRows count={5} />
            ) : overdueRows.length === 0 ? (
              <EmptyState icon={Receipt} title={t('financials.noOverdue')} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('financials.col.project')}</TableHead>
                    <TableHead>{t('financials.col.client')}</TableHead>
                    <TableHead className="text-end">{t('financials.col.amount')}</TableHead>
                    <TableHead className="text-end">{t('financials.col.daysOverdue')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueRows.map((inv) => {
                    const days = inv.due_date
                      ? Math.max(0, Math.floor((todayMs - new Date(inv.due_date).getTime()) / 86_400_000))
                      : null;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          {inv.project ? (
                            <Link
                              to={`/projects/${inv.project.id}`}
                              className="font-medium hover:underline"
                            >
                              {inv.project.name}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.project?.client?.company_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-end font-semibold text-rose-700">
                          {formatCurrencyILS(inv.amount)}
                        </TableCell>
                        <TableCell className="text-end">
                          {days != null ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                              <CalendarDays className="h-3 w-3" />
                              {t('financials.days', { count: days })}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('financials.agingTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {openInvoices === null ? (
              <SkeletonRows count={3} />
            ) : agingData.length === 0 ? (
              <EmptyState icon={Receipt} title={t('financials.noAging')} />
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={agingData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {agingData.map((d) => (
                          <Cell key={d.name} fill={d.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          typeof value === 'number' ? formatCurrencyILS(value) : String(value)
                        }
                        contentStyle={{ direction: 'rtl' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {agingData.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ background: d.color }}
                        />
                        {d.name}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCurrencyILS(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t('financials.payoutQueueTitle')}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {pending === null
              ? ''
              : t('financials.requestsCount', { count: pending.length })}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {pending === null ? (
            <SkeletonRows count={5} />
          ) : pending.length === 0 ? (
            <EmptyState icon={Wallet} title={t('financials.noPending')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('financials.col.supplier')}</TableHead>
                  <TableHead>{t('financials.col.project')}</TableHead>
                  <TableHead className="text-end">{t('financials.col.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell>
                      {pr.supplier_invoice?.supplier ? (
                        <Link
                          to={`/suppliers/${pr.supplier_invoice.supplier.id}`}
                          className="font-medium hover:underline"
                        >
                          {pr.supplier_invoice.supplier.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pr.supplier_invoice?.project ? (
                        <Link
                          to={`/projects/${pr.supplier_invoice.project.id}`}
                          className="hover:underline"
                        >
                          {pr.supplier_invoice.project.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-end font-medium tabular-nums">
                      {formatCurrencyILS(pr.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
