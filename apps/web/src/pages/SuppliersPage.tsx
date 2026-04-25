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
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type SupplierStatus = 'pending_approval' | 'active' | 'blocked';

const ALL_STATUSES: SupplierStatus[] = ['pending_approval', 'active', 'blocked'];

interface SupplierRow {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  status: SupplierStatus;
}

async function fetchSuppliers(): Promise<SupplierRow[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, category, phone, email, status')
    .order('name');
  if (error) throw error;
  return (data as SupplierRow[]) ?? [];
}

const columnHelper = createColumnHelper<SupplierRow>();

export function SuppliersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | ''>('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: suppliers = [], isPending, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: t('suppliers.name', { defaultValue: 'Name' }) as string,
        cell: (info) => <div className="font-medium">{info.getValue()}</div>,
      }),
      columnHelper.accessor('category', {
        header: t('suppliers.category', { defaultValue: 'Category' }) as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? '—'}</span>,
      }),
      columnHelper.accessor('phone', {
        header: t('suppliers.phone', { defaultValue: 'Phone' }) as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? '—'}</span>,
      }),
      columnHelper.accessor('email', {
        header: t('suppliers.email', { defaultValue: 'Email' }) as string,
        cell: (info) => (
          <span className="text-muted-foreground text-xs">{info.getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: t('suppliers.statusLabel', { defaultValue: 'Status' }) as string,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || row.getValue(columnId) === filterValue,
        cell: (info) => (
          <StatusBadge
            family="supplier"
            value={info.getValue()}
            label={t(`suppliers.status.${info.getValue()}`)}
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: (info) => {
          const s = info.row.original;
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
                  onSelect={() => navigate(`/suppliers/${s.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  {t('common.view')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate(`/suppliers/${s.id}`)}
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
    [navigate, t],
  );

  const columnFilters: ColumnFiltersState = useMemo(
    () => (statusFilter ? [{ id: 'status', value: statusFilter }] : []),
    [statusFilter],
  );

  const table = useReactTable({
    data: suppliers,
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
        r.name.toLowerCase().includes(v) ||
        (r.category?.toLowerCase().includes(v) ?? false) ||
        (r.phone?.toLowerCase().includes(v) ?? false) ||
        (r.email?.toLowerCase().includes(v) ?? false)
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
        <h1 className="text-2xl font-bold">{t('suppliers.title')}</h1>
        <Button asChild>
          <Link to="/suppliers/new">{t('suppliers.new')}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('suppliers.listTitle')}</CardTitle>
          <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
            <Input
              placeholder={t('suppliers.searchPlaceholder')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <Combobox
              value={statusFilter || null}
              onChange={(v) => setStatusFilter((v as SupplierStatus | null) ?? '')}
              placeholder={t('suppliers.allStatuses', { defaultValue: t('leads.allStatuses') })}
              options={ALL_STATUSES.map((s) => ({
                value: s,
                label: t(`suppliers.status.${s}`),
              }))}
              clearLabel={t('suppliers.allStatuses', { defaultValue: t('leads.allStatuses') })}
              searchPlaceholder={t('suppliers.statusLabel', { defaultValue: 'Status' })}
              emptyLabel={t('suppliers.noMatches')}
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
            <p className="text-sm text-muted-foreground p-6">
              {globalFilter || statusFilter ? t('suppliers.noMatches') : t('suppliers.empty')}
            </p>
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
                    onClick={() => navigate(`/suppliers/${row.original.id}`)}
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
