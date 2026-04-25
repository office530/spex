import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@spex/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];
const ALL_ROLES: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager', 'pm', 'foreman'];

export function UserEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile: myProfile } = useAuth();
  const isAdmin = myProfile ? BACK_OFFICE.includes(myProfile.role) : false;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('pm');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, phone, is_active')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        setError(error?.message ?? t('users.notFound'));
      } else {
        setFullName(data.full_name ?? '');
        setPhone(data.phone ?? '');
        setRole(data.role as UserRole);
        setIsActive(data.is_active as boolean);
      }
      setLoading(false);
    })();
  }, [id, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    const patch: Record<string, unknown> = {
      full_name: fullName,
      phone: phone || null,
    };
    if (isAdmin) {
      patch.role = role;
      patch.is_active = isActive;
    }
    const { error } = await supabase.from('user_profiles').update(patch).eq('id', id);
    setSaving(false);
    if (error) {
      setError(error.message);
      toast.error(t('common.errorToast'), { description: error.message });
    } else {
      toast.success(t('common.savedToast'));
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate(isAdmin ? '/users' : '/');
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('users.editTitle')}</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base">{t('users.editSubtitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t('users.fullName')}</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('users.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
              />
            </div>
            {isAdmin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('users.role')}</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={saving}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`roles.${r}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={saving}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="is_active">{t('users.isActive')}</Label>
                </div>
              </>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(isAdmin ? '/users' : '/')}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
