import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@spex/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  client: { company_name: string } | null;
  pm: { full_name: string } | null;
}

const statusBadgeClass: Record<ProjectStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  on_hold: 'bg-amber-100 text-amber-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-rose-100 text-rose-800',
};

export function ProjectsPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id, name, status, client:clients(company_name), pm:user_profiles!projects_pm_id_fkey(full_name)',
        )
        .order('name');
      if (error) {
        setError(error.message);
      } else {
        setProjects((data as unknown as ProjectRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.client?.company_name.toLowerCase().includes(q) ?? false) ||
        (p.pm?.full_name.toLowerCase().includes(q) ?? false),
    );
  }, [projects, query]);

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
          <Input
            placeholder={t('projects.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              {t('common.loading')}
            </p>
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">
              {query ? t('projects.noMatches') : t('projects.empty')}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between px-6 py-3 gap-4 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.client?.company_name ?? '—'}
                      {p.pm && <span> · {p.pm.full_name}</span>}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[p.status]}`}
                  >
                    {t(`projects.status.${p.status}`)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
