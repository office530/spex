import {
  EmptyState,
  formatCurrencyILS,
  SkeletonRows,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@spex/ui';
import { Award, ExternalLink, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

type SupplierQuoteStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revised';

interface QuoteRow {
  id: string;
  amount: number | null;
  status: SupplierQuoteStatus;
  notes: string | null;
  supplier: { id: string; name: string } | null;
}

interface ProcurementTabProps {
  lineId: string;
  projectId: string;
}

export function ProcurementTab({ lineId, projectId }: ProcurementTabProps) {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<QuoteRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('supplier_quotes')
        .select('id, amount, status, notes, supplier:suppliers(id, name)')
        .eq('boq_line_item_id', lineId)
        .order('amount', { ascending: true, nullsFirst: false });
      if (cancelled) return;
      setQuotes((data as unknown as QuoteRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [lineId]);

  if (quotes === null) {
    return <SkeletonRows count={3} />;
  }

  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title={t('workspace.procurement.empty')}
        description={t('workspace.procurement.emptyHint')}
        cta={{
          label: t('workspace.procurement.openInBoq'),
          onClick: () => {
            window.location.href = `/projects/${projectId}/boq`;
          },
        }}
      />
    );
  }

  const cheapest = quotes.reduce<QuoteRow | null>((min, q) => {
    if (q.amount == null) return min;
    if (!min || (min.amount ?? Infinity) > q.amount) return q;
    return min;
  }, null);

  const approved = quotes.find((q) => q.status === 'approved');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {t('workspace.procurement.title')}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('workspace.procurement.summary', {
              count: quotes.length,
              context: approved ? 'approved' : undefined,
            })}
          </p>
        </div>
        <Link
          to={`/projects/${projectId}/boq`}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
        >
          {t('workspace.procurement.openInBoq')}
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('workspace.procurement.col.supplier')}</TableHead>
              <TableHead className="text-end">{t('workspace.procurement.col.amount')}</TableHead>
              <TableHead>{t('workspace.procurement.col.status')}</TableHead>
              <TableHead>{t('workspace.procurement.col.rank')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <div className="font-medium">{q.supplier?.name ?? '—'}</div>
                  {q.notes && (
                    <div className="text-xs text-muted-foreground truncate max-w-xs">{q.notes}</div>
                  )}
                </TableCell>
                <TableCell className="text-end nums font-medium">
                  {q.amount != null ? formatCurrencyILS(q.amount) : '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    family="supplier_quote"
                    value={q.status}
                    label={t(`supplierQuotes.status.${q.status}`)}
                  />
                </TableCell>
                <TableCell>
                  {cheapest && q.id === cheapest.id ? (
                    <StatusBadge
                      family="flag"
                      value="cheapest"
                      label={t('supplierQuotes.cheapest')}
                      className="gap-1"
                    >
                      <Award className="w-3 h-3" aria-hidden />
                      {t('supplierQuotes.cheapest')}
                    </StatusBadge>
                  ) : cheapest && q.amount != null ? (
                    <span className="text-xs text-muted-foreground">
                      +{formatCurrencyILS(q.amount - (cheapest.amount ?? 0))}
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
