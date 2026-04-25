import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  SkeletonRows,
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
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ClientRow {
  id: string;
  company_name: string;
  primary_contact_name: string;
  phone: string | null;
  email: string | null;
}

async function fetchClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name, primary_contact_name, phone, email')
    .order('company_name');
  if (error) throw error;
  return (data as ClientRow[]) ?? [];
}

const columnHelper = createColumnHelper<ClientRow>();

export function ClientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: clients = [], isPending, error } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('company_name', {
        header: t('clients.companyName') as string,
        cell: (info) => <div className="font-medium">{info.getValue()}</div>,
      }),
      columnHelper.accessor('primary_contact_name', {
        header: t('clients.primaryContactName') as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor('phone', {
        header: t('clients.phone') as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? '—'}</span>,
      }),
      columnHelper.accessor('email', {
        header: t('clients.email') as string,
        cell: (info) => (
          <span className="text-muted-foreground text-xs">{info.getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: (info) => {
          const c = info.row.original;
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
                  onSelect={() => navigate(`/clients/${c.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  {t('common.view')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate(`/clients/${c.id}`)}
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

  const table = useReactTable({
    data: clients,
    columns,
    state: { sorting, globalFilter },
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
        r.company_name.toLowerCase().includes(v) ||
        r.primary_contact_name.toLowerCase().includes(v) ||
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
        <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
        <Button asChild>
          <Link to="/clients/new">{t('clients.new')}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('clients.listTitle')}</CardTitle>
          <Input
            placeholder={t('clients.searchPlaceholder')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          {isPending ? (
            <SkeletonRows count={5} />
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">
              {(error as Error).message}
            </p>
          ) : table.getRowModel().rows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">
              {globalFilter ? t('clients.noMatches') : t('clients.empty')}
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
                    onClick={() => navigate(`/clients/${row.original.id}`)}
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
