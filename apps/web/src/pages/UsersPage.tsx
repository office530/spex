import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

async function fetchUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, role, full_name, phone, is_active')
    .order('full_name');
  if (error) throw error;
  return (data as UserProfile[]) ?? [];
}

const columnHelper = createColumnHelper<UserProfile>();

export function UsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: users = [], isPending, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('full_name', {
        header: t('users.fullName') as string,
        cell: (info) => {
          const u = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="font-medium">{u.full_name || '—'}</div>
              {!u.is_active && (
                <span className="text-xs text-destructive">{t('users.inactive')}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('role', {
        header: t('users.role') as string,
        cell: (info) => (
          <span className="text-muted-foreground">{t(`roles.${info.getValue()}`)}</span>
        ),
      }),
      columnHelper.accessor('phone', {
        header: t('users.phone') as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? '—'}</span>,
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data: users,
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
        (r.full_name?.toLowerCase().includes(v) ?? false) ||
        (r.phone?.toLowerCase().includes(v) ?? false) ||
        r.role.toLowerCase().includes(v)
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
      <h1 className="text-2xl font-bold">{t('users.title')}</h1>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('users.listTitle')}</CardTitle>
          <Input
            placeholder={t('users.fullName')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          {isPending ? (
            <SkeletonRows count={4} />
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">
              {(error as Error).message}
            </p>
          ) : table.getRowModel().rows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">{t('users.empty')}</p>
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
                    onClick={() => navigate(`/users/${row.original.id}`)}
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
