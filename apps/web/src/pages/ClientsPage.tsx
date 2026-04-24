import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@spex/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ClientRow {
  id: string;
  company_name: string;
  primary_contact_name: string;
  phone: string | null;
  email: string | null;
}

export function ClientsPage() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, primary_contact_name, phone, email')
        .order('company_name');
      if (error) {
        setError(error.message);
      } else {
        setClients((data as ClientRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        c.primary_contact_name.toLowerCase().includes(q) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false),
    );
  }, [clients, query]);

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
              {query ? t('clients.noMatches') : t('clients.empty')}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  to={`/clients/${c.id}`}
                  className="flex items-center justify-between px-6 py-3 gap-4 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.primary_contact_name}
                    </div>
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
