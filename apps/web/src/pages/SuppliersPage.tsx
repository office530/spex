import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  StatusBadge,
} from '@spex/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type SupplierStatus = 'pending_approval' | 'active' | 'blocked';

interface SupplierRow {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  status: SupplierStatus;
}

export function SuppliersPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, category, phone, email, status')
        .order('name');
      if (error) {
        setError(error.message);
      } else {
        setSuppliers((data as SupplierRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category?.toLowerCase().includes(q) ?? false) ||
        (s.phone?.toLowerCase().includes(q) ?? false) ||
        (s.email?.toLowerCase().includes(q) ?? false),
    );
  }, [suppliers, query]);

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
          <Input
            placeholder={t('suppliers.searchPlaceholder')}
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
              {query ? t('suppliers.noMatches') : t('suppliers.empty')}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((s) => (
                <Link
                  key={s.id}
                  to={`/suppliers/${s.id}`}
                  className="flex items-center justify-between px-6 py-3 gap-4 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{s.name}</span>
                      <StatusBadge
                        family="supplier"
                        value={s.status}
                        label={t(`suppliers.status.${s.status}`)}
                        className="shrink-0"
                      />
                    </div>
                    {s.category && (
                      <div className="text-xs text-muted-foreground truncate">
                        {s.category}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground text-end hidden sm:block">
                    {s.phone && <div>{s.phone}</div>}
                    {s.email && <div className="text-xs truncate max-w-[16rem]">{s.email}</div>}
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
