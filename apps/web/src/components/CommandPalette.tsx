import { Dialog, DialogContent, DialogTitle } from '@spex/ui';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  FolderKanban,
  History,
  Inbox,
  LayoutDashboard,
  Search,
  Settings,
  Target,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface NavCommand {
  to: string;
  icon: LucideIcon;
  labelKey: string;
}

const NAV_COMMANDS: NavCommand[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/projects', icon: FolderKanban, labelKey: 'nav.projects' },
  { to: '/leads', icon: Target, labelKey: 'nav.leads' },
  { to: '/clients', icon: Building2, labelKey: 'nav.clients' },
  { to: '/suppliers', icon: Truck, labelKey: 'nav.suppliers' },
  { to: '/consultants', icon: Briefcase, labelKey: 'nav.consultants' },
  { to: '/tickets', icon: Inbox, labelKey: 'nav.tickets' },
  { to: '/calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
  { to: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { to: '/activity', icon: History, labelKey: 'nav.activity' },
  { to: '/settings/milestones', icon: Settings, labelKey: 'nav.settings' },
];

interface EntityHit {
  kind: 'project' | 'lead' | 'client';
  id: string;
  label: string;
  sub?: string;
}

async function searchEntities(q: string): Promise<EntityHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const [projRes, leadRes, clientRes] = await Promise.all([
    supabase.from('projects').select('id, name').ilike('name', like).limit(5),
    supabase
      .from('leads')
      .select('id, full_name, phone')
      .or(`full_name.ilike.${like},phone.ilike.${like}`)
      .limit(5),
    supabase
      .from('clients')
      .select('id, company_name, primary_contact_name')
      .or(`company_name.ilike.${like},primary_contact_name.ilike.${like}`)
      .limit(5),
  ]);

  const hits: EntityHit[] = [];
  for (const p of (projRes.data as Array<{ id: string; name: string }> | null) ?? []) {
    hits.push({ kind: 'project', id: p.id, label: p.name });
  }
  for (const l of (leadRes.data as Array<{ id: string; full_name: string; phone: string }> | null) ??
    []) {
    hits.push({ kind: 'lead', id: l.id, label: l.full_name, sub: l.phone });
  }
  for (const c of (clientRes.data as Array<{
    id: string;
    company_name: string;
    primary_contact_name: string;
  }> | null) ?? []) {
    hits.push({ kind: 'client', id: c.id, label: c.company_name, sub: c.primary_contact_name });
  }
  return hits;
}

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: hits = [] } = useQuery({
    queryKey: ['command-palette', search],
    queryFn: () => searchEntities(search),
    enabled: open && search.trim().length >= 2,
  });

  function go(path: string) {
    setOpen(false);
    setSearch('');
    navigate(path);
  }

  function entityPath(kind: EntityHit['kind'], id: string) {
    return kind === 'project' ? `/projects/${id}` : kind === 'lead' ? `/leads/${id}` : `/clients/${id}`;
  }

  function entityKindLabel(kind: EntityHit['kind']) {
    return kind === 'project'
      ? t('nav.projects')
      : kind === 'lead'
        ? t('nav.leads')
        : t('nav.clients');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 max-w-xl">
        <DialogTitle className="sr-only">{t('cmdk.title')}</DialogTitle>
        <Command label={t('cmdk.title')} className="bg-transparent" shouldFilter={false}>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={t('cmdk.placeholder')}
              className="flex h-11 w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {search.trim().length < 2 ? t('cmdk.startTyping') : t('cmdk.noResults')}
            </Command.Empty>

            {hits.length > 0 && (
              <Command.Group heading={t('cmdk.entitiesHeading')} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {hits.map((hit) => (
                  <Command.Item
                    key={`${hit.kind}-${hit.id}`}
                    value={`${hit.kind}-${hit.id}-${hit.label}`}
                    onSelect={() => go(entityPath(hit.kind, hit.id))}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-muted"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{hit.label}</div>
                      {hit.sub && (
                        <div className="text-xs text-muted-foreground truncate">{hit.sub}</div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {entityKindLabel(hit.kind)}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading={t('cmdk.navHeading')} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {NAV_COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                const label = t(cmd.labelKey);
                return (
                  <Command.Item
                    key={cmd.to}
                    value={`nav-${cmd.to}-${label}`}
                    onSelect={() => go(cmd.to)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-end gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            <span>{t('cmdk.toggle')}</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
