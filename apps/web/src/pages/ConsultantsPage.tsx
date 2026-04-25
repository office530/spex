import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@spex/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ConsultantRow {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
}

async function fetchConsultants(): Promise<ConsultantRow[]> {
  const { data, error } = await supabase
    .from('consultants')
    .select('id, name, specialty, phone, email')
    .order('name');
  if (error) throw error;
  return (data as ConsultantRow[]) ?? [];
}

export function ConsultantsPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const { data: rows = [], isPending, error } = useQuery({
    queryKey: ['consultants'],
    queryFn: fetchConsultants,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.specialty?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('consultants.title')}</h1>
        <Button asChild>
          <Link to="/consultants/new">{t('consultants.new')}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">{t('consultants.listTitle')}</CardTitle>
          <Input
            placeholder={t('consultants.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          {isPending ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              {t('common.loading')}
            </p>
          ) : error ? (
            <p className="text-sm text-destructive p-6 text-center">
              {(error as Error).message}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">
              {query ? t('consultants.noMatches') : t('consultants.empty')}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  to={`/consultants/${c.id}`}
                  className="flex items-center justify-between px-6 py-3 gap-4 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    {c.specialty && (
                      <div className="text-xs text-muted-foreground truncate">
                        {c.specialty}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground text-end hidden sm:block">
                    {c.phone && <div>{c.phone}</div>}
                    {c.email && <div className="text-xs truncate max-w-[16rem]">{c.email}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
