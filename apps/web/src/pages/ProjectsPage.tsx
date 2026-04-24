import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  formatCurrencyILS,
  Input,
  StatusBadge,
} from '@spex/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
type ProjectType = 'execution' | 'planning_execution';

interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  type: ProjectType;
  contract_value: number | null;
  client: { company_name: string } | null;
  pm: { full_name: string } | null;
}

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
          'id, name, status, type, contract_value, client:clients(company_name), pm:user_profiles!projects_pm_id_fkey(full_name)',
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
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.client?.company_name ?? '—'}
                      {p.pm && <span> · {p.pm.full_name}</span>}
                      <span> · {t(`projects.types.${p.type}`)}</span>
                    </div>
                  </div>
                  {p.contract_value != null && (
                    <div className="shrink-0 text-sm font-medium hidden sm:block">
                      {formatCurrencyILS(p.contract_value)}
                    </div>
                  )}
                  <StatusBadge
                    family="project"
                    value={p.status}
                    label={t(`projects.status.${p.status}`)}
                    className="shrink-0"
                  />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
