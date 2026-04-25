import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  formatCurrencyILS,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  SkeletonRows,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@spex/ui';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
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

interface LeadRow {
  id: string;
  full_name: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  estimated_value: number | null;
  last_contact_at: string | null;
  owner: { full_name: string } | null;
}

async function fetchLeads(): Promise<LeadRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, full_name, phone, status, source, estimated_value, last_contact_at, owner:user_profiles(full_name)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as LeadRow[]) ?? [];
}

const columnHelper = createColumnHelper<LeadRow>();

export function LeadsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: leads = [], isPending, error } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  });

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' }),
    [i18n.language],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('full_name', {
        header: t('leads.fullName') as string,
        cell: (info) => {
          const lead = info.row.original;
          return (
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <span className="font-medium hover:underline cursor-default">
                  {lead.full_name}
                </span>
              </HoverCardTrigger>
              <HoverCardContent align="start" className="space-y-2">
                <div className="font-semibold">{lead.full_name}</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{lead.phone}</div>
                  {lead.owner?.full_name && (
                    <div>
                      {t('leads.owner')}: {lead.owner.full_name}
                    </div>
                  )}
                  <div>
                    {t('leads.sourceLabel')}: {t(`leads.source.${lead.source}`)}
                  </div>
                  {lead.estimated_value != null && (
                    <div>
                      {t('leads.estimatedValue')}: {formatCurrencyILS(lead.estimated_value)}
                    </div>
                  )}
                </div>
                <StatusBadge
                  family="lead"
                  value={lead.status}
                  label={t(`leads.status.${lead.status}`)}
                />
              </HoverCardContent>
            </HoverCard>
          );
        },
      }),
      columnHelper.accessor('phone', {
        header: t('leads.phone') as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor('source', {
        header: t('leads.sourceLabel') as string,
        cell: (info) => (
          <span className="text-muted-foreground">{t(`leads.source.${info.getValue()}`)}</span>
        ),
      }),
      columnHelper.accessor((row) => row.owner?.full_name ?? '', {
        id: 'owner',
        header: t('leads.owner') as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('estimated_value', {
        header: t('leads.estimatedValue') as string,
        cell: (info) => {
          const v = info.getValue();
          return v == null ? '—' : formatCurrencyILS(v);
        },
      }),
      columnHelper.accessor('last_contact_at', {
        header: t('leads.lastContactAt') as string,
        cell: (info) => {
          const v = info.getValue();
          return v ? dateFmt.format(new Date(v)) : '—';
        },
      }),
      columnHelper.accessor('status', {
        header: t('leads.statusLabel') as string,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || row.getValue(columnId) === filterValue,
        cell: (info) => (
          <StatusBadge
            family="lead"
            value={info.getValue()}
            label={t(`leads.status.${info.getValue()}`)}
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: (info) => {
          const lead = info.row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('common.actions')}
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => navigate(`/leads/${lead.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  {t('common.view')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate(`/leads/${lead.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil className="h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>{lead.phone}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    [dateFmt, navigate, t],
  );

  const columnFilters: ColumnFiltersState = useMemo(
    () => (statusFilter ? [{ id: 'status', value: statusFilter }] : []),
    [statusFilter],
  );

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const v = String(filterValue).trim().toLowerCase();
      if (!v) return true;
      const r = row.original;
      return (
        r.full_name.toLowerCase().includes(v) ||
        r.phone.toLowerCase().includes(v) ||
        (r.owner?.full_name.toLowerCase().includes(v) ?? false)
      );
    },
  });

  const sortIcon = (state: false | 'asc' | 'desc') => {
    if (state === 'asc') return <ArrowUp className="h-3 w-3" />;
    if (state === 'desc') return <ArrowDown className="h-3 w-3" />;
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />;
  };

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
          <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
            <Input
              placeholder={t('leads.searchPlaceholder')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <Combobox
              value={statusFilter || null}
              onChange={(v) => setStatusFilter((v as LeadStatus | null) ?? '')}
              placeholder={t('leads.allStatuses')}
              options={ALL_STATUSES.map((s) => ({
                value: s,
                label: t(`leads.status.${s}`),
              }))}
              clearLabel={t('leads.allStatuses')}
              searchPlaceholder={t('leads.statusLabel')}
              emptyLabel={t('leads.noMatches')}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isPending ? (
            <SkeletonRows count={6} />
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">
              {(error as Error).message}
            </p>
          ) : table.getRowModel().rows.length === 0 ? (
            <EmptyState
              icon={Target}
              title={
                globalFilter || statusFilter ? t('leads.noMatches') : t('leads.empty')
              }
            />
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortIcon(header.column.getIsSorted())}
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => navigate(`/leads/${row.original.id}`)}
                    className="cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
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
