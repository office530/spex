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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ClipboardList,
  Eye,
  MoreHorizontal,
  Pencil,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
type ProjectType = 'execution' | 'planning_execution';

const ALL_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed', 'cancelled'];

interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  type: ProjectType;
  contract_value: number | null;
  client: { company_name: string } | null;
  pm: { full_name: string } | null;
}

async function fetchProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, name, status, type, contract_value, client:clients(company_name), pm:user_profiles!pm_id(full_name)',
    )
    .order('name');
  if (error) throw error;
  return (data as unknown as ProjectRow[]) ?? [];
}

const columnHelper = createColumnHelper<ProjectRow>();

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;

  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: projects = [], isPending, error } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: t('projects.name', { defaultValue: 'Name' }) as string,
        cell: (info) => {
          const p = info.row.original;
          return (
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <span className="font-medium hover:underline cursor-default">{p.name}</span>
              </HoverCardTrigger>
              <HoverCardContent align="start" className="space-y-2">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{p.client?.company_name ?? '—'}</div>
                  {p.pm?.full_name && <div>PM: {p.pm.full_name}</div>}
                  <div>{t(`projects.types.${p.type}`)}</div>
                  {p.contract_value != null && <div>{formatCurrencyILS(p.contract_value)}</div>}
                </div>
                <StatusBadge
                  family="project"
                  value={p.status}
                  label={t(`projects.status.${p.status}`)}
                />
              </HoverCardContent>
            </HoverCard>
          );
        },
      }),
      columnHelper.accessor((row) => row.client?.company_name ?? '', {
        id: 'client',
        header: t('projects.client', { defaultValue: 'Client' }) as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor((row) => row.pm?.full_name ?? '', {
        id: 'pm',
        header: t('projects.pm', { defaultValue: 'PM' }) as string,
        cell: (info) => <span className="text-muted-foreground">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('type', {
        header: t('projects.typeLabel', { defaultValue: 'Type' }) as string,
        cell: (info) => (
          <span className="text-muted-foreground">{t(`projects.types.${info.getValue()}`)}</span>
        ),
      }),
      columnHelper.accessor('contract_value', {
        header: t('projects.contractValue') as string,
        cell: (info) => {
          const v = info.getValue();
          return v == null ? '—' : formatCurrencyILS(v);
        },
      }),
      columnHelper.accessor('status', {
        header: t('projects.statusLabel', { defaultValue: 'Status' }) as string,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || row.getValue(columnId) === filterValue,
        cell: (info) => (
          <StatusBadge
            family="project"
            value={info.getValue()}
            label={t(`projects.status.${info.getValue()}`)}
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: (info) => {
          const p = info.row.original;
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
                  onSelect={() => navigate(`/projects/${p.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  {t('common.view')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate(`/projects/${p.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil className="h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => navigate(`/projects/${p.id}/boq`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ClipboardList className="h-4 w-4" />
                  {t('boq.manage')}
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
    data: projects,
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
        (r.client?.company_name.toLowerCase().includes(v) ?? false) ||
        (r.pm?.full_name.toLowerCase().includes(v) ?? false)
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
        <h1 className="text-2xl font-bold">{t('projects.title')}</h1>
        {isAdmin && (
          <Button asChild>
            <Link to="/projects/new">{t('projects.new')}</Link>
          </Button>
        )}
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('projects.listTitle')}</CardTitle>
          <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
            <Input
              placeholder={t('projects.searchPlaceholder')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <Combobox
              value={statusFilter || null}
              onChange={(v) => setStatusFilter((v as ProjectStatus | null) ?? '')}
              placeholder={t('projects.allStatuses', { defaultValue: t('leads.allStatuses') })}
              options={ALL_STATUSES.map((s) => ({
                value: s,
                label: t(`projects.status.${s}`),
              }))}
              clearLabel={t('projects.allStatuses', { defaultValue: t('leads.allStatuses') })}
              searchPlaceholder={t('projects.statusLabel', { defaultValue: 'Status' })}
              emptyLabel={t('projects.noMatches')}
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
              icon={ClipboardList}
              title={
                globalFilter || statusFilter
                  ? t('projects.noMatches')
                  : t('projects.empty')
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
                    onClick={() => navigate(`/projects/${row.original.id}`)}
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
