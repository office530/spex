import { Dialog, DialogContent, DialogTitle } from '@spex/ui';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderKanban,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  ListChecks,
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

type EntityKind =
  | 'project'
  | 'lead'
  | 'client'
  | 'chapter'
  | 'line'
  | 'qc'
  | 'task'
  | 'document';

interface EntityHit {
  kind: EntityKind;
  id: string;
  label: string;
  sub?: string;
  // Workspace navigation context
  projectId?: string;
  chapterId?: string;
  lineId?: string;
}

const KIND_ICON: Record<EntityKind, LucideIcon> = {
  project: FolderKanban,
  lead: Target,
  client: Building2,
  chapter: Layers,
  line: ListChecks,
  qc: ClipboardCheck,
  task: ListChecks,
  document: FileText,
};

async function searchEntities(q: string): Promise<EntityHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;

  const [
    projRes,
    leadRes,
    clientRes,
    chapterRes,
    lineRes,
    qcRes,
    taskRes,
    docRes,
  ] = await Promise.all([
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
    // Phase 79: workspace entity searches
    supabase
      .from('boq_chapters')
      .select('id, name, project_id, project:projects(name)')
      .ilike('name', like)
      .limit(5),
    supabase
      .from('boq_line_items')
      .select(
        'id, description, chapter_id, project_id, chapter:boq_chapters(name), project:projects(name)',
      )
      .ilike('description', like)
      .limit(5),
    supabase
      .from('boq_line_item_checks')
      .select(
        'id, description, line_item_id, line:boq_line_items(id, description, chapter_id, project_id, project:projects(name))',
      )
      .ilike('description', like)
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, project_id, project:projects(name)')
      .ilike('title', like)
      .limit(5),
    supabase
      .from('documents')
      .select('id, filename, project_id, project:projects(name)')
      .ilike('filename', like)
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

  // Workspace entities
  for (const ch of (chapterRes.data as Array<{
    id: string;
    name: string;
    project_id: string;
    project: { name: string } | null;
  }> | null) ?? []) {
    hits.push({
      kind: 'chapter',
      id: ch.id,
      label: ch.name,
      sub: ch.project?.name,
      projectId: ch.project_id,
      chapterId: ch.id,
    });
  }
  for (const li of (lineRes.data as Array<{
    id: string;
    description: string;
    chapter_id: string;
    project_id: string;
    chapter: { name: string } | null;
    project: { name: string } | null;
  }> | null) ?? []) {
    hits.push({
      kind: 'line',
      id: li.id,
      label: li.description,
      sub: [li.project?.name, li.chapter?.name].filter(Boolean).join(' · '),
      projectId: li.project_id,
      chapterId: li.chapter_id,
      lineId: li.id,
    });
  }
  for (const q of (qcRes.data as Array<{
    id: string;
    description: string;
    line_item_id: string;
    line: {
      id: string;
      description: string;
      chapter_id: string;
      project_id: string;
      project: { name: string } | null;
    } | null;
  }> | null) ?? []) {
    if (!q.line) continue;
    hits.push({
      kind: 'qc',
      id: q.id,
      label: q.description,
      sub: [q.line.project?.name, q.line.description].filter(Boolean).join(' · '),
      projectId: q.line.project_id,
      chapterId: q.line.chapter_id,
      lineId: q.line.id,
    });
  }
  for (const tk of (taskRes.data as Array<{
    id: string;
    title: string;
    project_id: string | null;
    project: { name: string } | null;
  }> | null) ?? []) {
    hits.push({
      kind: 'task',
      id: tk.id,
      label: tk.title,
      sub: tk.project?.name,
      projectId: tk.project_id ?? undefined,
    });
  }
  for (const d of (docRes.data as Array<{
    id: string;
    filename: string;
    project_id: string;
    project: { name: string } | null;
  }> | null) ?? []) {
    hits.push({
      kind: 'document',
      id: d.id,
      label: d.filename,
      sub: d.project?.name,
      projectId: d.project_id,
    });
  }

  return hits;
}

function entityPath(hit: EntityHit): string {
  switch (hit.kind) {
    case 'project':
      return `/projects/${hit.id}`;
    case 'lead':
      return `/leads/${hit.id}`;
    case 'client':
      return `/clients/${hit.id}`;
    case 'chapter':
      return `/projects/${hit.projectId}/workspace?chapter=${hit.chapterId}`;
    case 'line':
      return `/projects/${hit.projectId}/workspace?chapter=${hit.chapterId}&line=${hit.lineId}`;
    case 'qc':
      return `/projects/${hit.projectId}/workspace?chapter=${hit.chapterId}&line=${hit.lineId}&tab=qc`;
    case 'task':
      return hit.projectId ? `/projects/${hit.projectId}` : '/projects';
    case 'document':
      return hit.projectId ? `/projects/${hit.projectId}` : '/projects';
  }
}

function entityKindLabel(kind: EntityKind, t: (key: string) => string): string {
  switch (kind) {
    case 'project':
      return t('nav.projects');
    case 'lead':
      return t('nav.leads');
    case 'client':
      return t('nav.clients');
    case 'chapter':
      return t('cmdk.kind.chapter');
    case 'line':
      return t('cmdk.kind.line');
    case 'qc':
      return t('cmdk.kind.qc');
    case 'task':
      return t('cmdk.kind.task');
    case 'document':
      return t('cmdk.kind.document');
  }
}

const ENTITY_GROUPS: Array<{ kinds: EntityKind[]; headingKey: string }> = [
  { kinds: ['project', 'lead', 'client'], headingKey: 'cmdk.entitiesHeading' },
  { kinds: ['chapter', 'line', 'qc'], headingKey: 'cmdk.workspaceHeading' },
  { kinds: ['task', 'document'], headingKey: 'cmdk.otherHeading' },
];

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
          <Command.List className="max-h-96 overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {search.trim().length < 2 ? t('cmdk.startTyping') : t('cmdk.noResults')}
            </Command.Empty>

            {ENTITY_GROUPS.map((group) => {
              const groupHits = hits.filter((h) => group.kinds.includes(h.kind));
              if (groupHits.length === 0) return null;
              return (
                <Command.Group
                  key={group.headingKey}
                  heading={t(group.headingKey)}
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {groupHits.map((hit) => {
                    const Icon = KIND_ICON[hit.kind];
                    return (
                      <Command.Item
                        key={`${hit.kind}-${hit.id}`}
                        value={`${hit.kind}-${hit.id}-${hit.label}`}
                        onSelect={() => go(entityPath(hit))}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-muted"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{hit.label}</div>
                            {hit.sub && (
                              <div className="text-xs text-muted-foreground truncate">{hit.sub}</div>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {entityKindLabel(hit.kind, t)}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}

            <Command.Group
              heading={t('cmdk.navHeading')}
              className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
            >
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
