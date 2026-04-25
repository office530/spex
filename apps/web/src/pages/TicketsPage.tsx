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
  DropdownMenuTrigger,
  EmptyState,
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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Inbox,
  MoreHorizontal,
  Pencil,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
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

async function fetchTickets(): Promise<TicketRow[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(
      'id, subject, opener_type, opener_name, status, created_at, project:projects(name), assignee:user_profiles(full_name)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as TicketRow[]) ?? [];
}

const columnHelper = createColumnHelper<TicketRow>();

export function TicketsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: tickets = [], isPending, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' }),
    [i18n.language],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('subject', {
        header: t('tickets.subject') as string,
        cell: (info) => <div className="font-medium">{info.getValue()}</div>,
      }),
      columnHelper.accessor('opener_type', {
        header: t('tickets.openerLabel') as string,
        cell: (info) => {
          const tk = info.row.original;
          return (
            <span className="text-muted-foreground">
              {t(`tickets.opener.${tk.opener_type}`)}
              {tk.opener_name ? ` · ${tk.opener_name}` : ''}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.project?.name ?? '', {
        id: 'project',
        header: t('tickets.project') as string,
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor((row) => row.assignee?.full_name ?? '', {
        id: 'assignee',
        header: t('tickets.assignedTo') as string,
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue() || t('tickets.unassigned')}</span>
        ),
      }),
      columnHelper.accessor('created_at', {
        header: t('tickets.openedAt', { defaultValue: 'Opened' }) as string,
        cell: (info) => (
          <span className="text-muted-foreground text-xs">
            {dateFmt.format(new Date(info.getValue()))}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: t('tickets.statusLabel') as string,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || row.getValue(columnId) === filterValue,
        cell: (info) => (
          <StatusBadge
            family="ticket"
            value={info.getValue()}
            label={t(`tickets.status.${info.getValue()}`)}
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: (info) => {
          const tk = info.row.original;
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
                  onSelect={() => navigate(`/tickets/${tk.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  {t('common.view')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate(`/tickets/${tk.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil className="h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
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
    data: tickets,
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
        r.subject.toLowerCase().includes(v) ||
        (r.opener_name?.toLowerCase().includes(v) ?? false) ||
        (r.project?.name.toLowerCase().includes(v) ?? false) ||
        (r.assignee?.full_name.toLowerCase().includes(v) ?? false)
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
        <h1 className="text-2xl font-bold">{t('tickets.title')}</h1>
        <Button asChild>
          <Link to="/tickets/new">{t('tickets.new')}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('tickets.listTitle')}</CardTitle>
          <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
            <Input
              placeholder={t('tickets.searchPlaceholder')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <Combobox
              value={statusFilter || null}
              onChange={(v) => setStatusFilter((v as TicketStatus | null) ?? '')}
              placeholder={t('tickets.allStatuses')}
              options={ALL_STATUSES.map((s) => ({
                value: s,
                label: t(`tickets.status.${s}`),
              }))}
              clearLabel={t('tickets.allStatuses')}
              searchPlaceholder={t('tickets.statusLabel')}
              emptyLabel={t('tickets.noMatches')}
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
              icon={Inbox}
              title={globalFilter || statusFilter ? t('tickets.noMatches') : t('tickets.empty')}
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
                    onClick={() => navigate(`/tickets/${row.original.id}`)}
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
