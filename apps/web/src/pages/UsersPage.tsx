import { Button, Card, CardContent, CardHeader, CardTitle } from '@spex/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, phone, is_active')
        .order('full_name');
      if (error) {
        setError(error.message);
      } else {
        setUsers((data as UserProfile[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive py-8 text-center">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('users.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('users.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">{t('users.empty')}</p>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-6 py-3 gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`roles.${u.role}`)}
                      {!u.is_active && (
                        <span className="ms-2 text-destructive">{t('users.inactive')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {u.phone && (
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {u.phone}
                      </span>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/users/${u.id}`}>{t('common.edit')}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
