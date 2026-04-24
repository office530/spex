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
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { UserRole } from '../auth/AuthContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const BACK_OFFICE: UserRole[] = ['ceo', 'vp', 'cfo', 'office_manager'];

type ProjectType = 'execution' | 'planning_execution';
type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
type MemberRole = 'pm' | 'foreman' | 'viewer';

const PROJECT_TYPES: ProjectType[] = ['execution', 'planning_execution'];
const PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed', 'cancelled'];
const MEMBER_ROLES: MemberRole[] = ['pm', 'foreman', 'viewer'];

interface ProjectForm {
  name: string;
  client_id: string;
  type: ProjectType;
  pm_id: string;
  status: ProjectStatus;
  start_date: string;
  target_end_date: string;
  contract_value: string;
  notes: string;
}

const emptyForm: ProjectForm = {
  name: '',
  client_id: '',
  type: 'execution',
  pm_id: '',
  status: 'active',
  start_date: '',
  target_end_date: '',
  contract_value: '',
  notes: '',
};

interface ClientOption {
  id: string;
  company_name: string;
}

interface UserOption {
  id: string;
  full_name: string;
  role: UserRole;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: MemberRole;
  profile: { full_name: string; role: UserRole } | null;
}

function toDateInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function fromDateInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function ProjectEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const isAdmin = profile ? BACK_OFFICE.includes(profile.role) : false;
  const isCreate = !id;
  const fromLeadId = isCreate ? (searchParams.get('from_lead') ?? null) : null;

  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = !isAdmin;

  useEffect(() => {
    void (async () => {
      const [clientsRes, usersRes, projectRes, leadRes] = await Promise.all([
        isAdmin
          ? supabase.from('clients').select('id, company_name').order('company_name')
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('user_profiles')
          .select('id, full_name, role')
          .eq('is_active', true)
          .order('full_name'),
        isCreate
          ? Promise.resolve({ data: null, error: null })
          : supabase
              .from('projects')
              .select(
                'name, client_id, type, pm_id, status, start_date, target_end_date, contract_value, notes',
              )
              .eq('id', id)
              .maybeSingle(),
        fromLeadId
          ? supabase
              .from('leads')
              .select('full_name, type, estimated_value, notes')
              .eq('id', fromLeadId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (clientsRes.error) setError(clientsRes.error.message);
      else setClients((clientsRes.data as ClientOption[]) ?? []);

      if (usersRes.error) setError(usersRes.error.message);
      else setUsers((usersRes.data as UserOption[]) ?? []);

      if (!isCreate) {
        if (projectRes.error || !projectRes.data) {
          setError(projectRes.error?.message ?? t('projects.notFound'));
        } else {
          const p = projectRes.data as {
            name: string;
            client_id: string;
            type: ProjectType;
            pm_id: string | null;
            status: ProjectStatus;
            start_date: string | null;
            target_end_date: string | null;
            contract_value: number | null;
            notes: string | null;
          };
          setForm({
            name: p.name ?? '',
            client_id: p.client_id ?? '',
            type: p.type ?? 'execution',
            pm_id: p.pm_id ?? '',
            status: p.status ?? 'active',
            start_date: toDateInput(p.start_date),
            target_end_date: toDateInput(p.target_end_date),
            contract_value: p.contract_value != null ? String(p.contract_value) : '',
            notes: p.notes ?? '',
          });
        }
      } else if (fromLeadId && leadRes.data) {
        const l = leadRes.data as {
          full_name: string;
          type: string;
          estimated_value: number | null;
          notes: string | null;
        };
        setForm((f) => ({
          ...f,
          name: l.full_name,
          type: l.type === 'planning' ? 'planning_execution' : 'execution',
          contract_value: l.estimated_value != null ? String(l.estimated_value) : '',
          notes: l.notes ?? '',
        }));
      }
      setLoading(false);
    })();
  }, [id, isCreate, isAdmin, fromLeadId, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      client_id: form.client_id,
      type: form.type,
      pm_id: form.pm_id || null,
      status: form.status,
      start_date: fromDateInput(form.start_date),
      target_end_date: fromDateInput(form.target_end_date),
      contract_value: form.contract_value ? Number(form.contract_value) : null,
      notes: form.notes || null,
    };
    if (isCreate) {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...payload, ...(fromLeadId ? { created_from_lead_id: fromLeadId } : {}) })
        .select('id')
        .single();
      setSaving(false);
      if (error) setError(error.message);
      else navigate(`/projects/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from('projects').update(payload).eq('id', id);
      setSaving(false);
      if (error) setError(error.message);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isCreate ? t('projects.newTitle') : t('projects.editTitle')}
        </h1>
        <Button variant="ghost" onClick={() => navigate('/projects')} disabled={saving}>
          {t('common.back')}
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base">{t('projects.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">{t('projects.name')} *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  disabled={saving || readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_id">{t('projects.client')} *</Label>
                <SelectField
                  id="client_id"
                  value={form.client_id}
                  onChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
                  required
                  disabled={saving || readOnly || !isAdmin}
                >
                  <option value="">{t('projects.selectClient')}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('projects.type')} *</Label>
                <SelectField
                  id="type"
                  value={form.type}
                  onChange={(v) => setForm((f) => ({ ...f, type: v as ProjectType }))}
                  disabled={saving || readOnly}
                >
                  {PROJECT_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {t(`projects.types.${ty}`)}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm_id">{t('projects.pm')}</Label>
                <SelectField
                  id="pm_id"
                  value={form.pm_id}
                  onChange={(v) => setForm((f) => ({ ...f, pm_id: v }))}
                  disabled={saving || readOnly}
                >
                  <option value="">{t('projects.noPm')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} · {t(`roles.${u.role}`)}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t('projects.statusLabel')}</Label>
                <SelectField
                  id="status"
                  value={form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: v as ProjectStatus }))}
                  disabled={saving || readOnly}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`projects.status.${s}`)}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">{t('projects.startDate')}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, start_date: e.target.value }))
                  }
                  disabled={saving || readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_end_date">{t('projects.targetEndDate')}</Label>
                <Input
                  id="target_end_date"
                  type="date"
                  value={form.target_end_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target_end_date: e.target.value }))
                  }
                  disabled={saving || readOnly}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contract_value">{t('projects.contractValue')}</Label>
                <Input
                  id="contract_value"
                  type="number"
                  min="0"
                  value={form.contract_value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contract_value: e.target.value }))
                  }
                  disabled={saving || readOnly}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{t('projects.notes')}</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  disabled={saving || readOnly}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
          {!readOnly && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {!isCreate && id && (
        <MembersPanel projectId={id} isAdmin={isAdmin} users={users} />
      )}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
}

function SelectField({ id, value, onChange, children, required, disabled }: SelectFieldProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      {children}
    </select>
  );
}

interface MembersPanelProps {
  projectId: string;
  isAdmin: boolean;
  users: UserOption[];
}

function MembersPanel({ projectId, isAdmin, users }: MembersPanelProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('pm');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from('project_members')
      .select('id, user_id, role, profile:user_profiles(full_name, role)')
      .eq('project_id', projectId);
    if (error) {
      setError(error.message);
    } else {
      setMembers((data as unknown as MemberRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const existingUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = users.filter((u) => !existingUserIds.has(u.id));

  function startAdd() {
    setAdding(true);
    setNewUserId(availableUsers[0]?.id ?? '');
    setNewRole('pm');
    setError(null);
  }

  function cancelAdd() {
    setAdding(false);
    setNewUserId('');
    setError(null);
  }

  async function addMember(e: FormEvent) {
    e.preventDefault();
    if (!newUserId) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: newUserId, role: newRole });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    cancelAdd();
    await refresh();
  }

  async function removeMember(m: MemberRow) {
    if (!confirm(t('members.confirmRemove'))) return;
    const { error } = await supabase.from('project_members').delete().eq('id', m.id);
    if (error) {
      setError(error.message);
      return;
    }
    await refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t('members.title')}</CardTitle>
        {isAdmin && !adding && availableUsers.length > 0 && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('members.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : members.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground p-6">{t('members.empty')}</p>
        ) : (
          <div className="divide-y">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-6 py-3 gap-4"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.profile?.full_name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(`members.role.${m.role}`)}
                    {m.profile && <span> · {t(`roles.${m.profile.role}`)}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void removeMember(m)}
                  >
                    {t('common.remove')}
                  </Button>
                )}
              </div>
            ))}
            {adding && (
              <form onSubmit={addMember} className="px-6 py-4 space-y-3 bg-muted/40">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="new_member_user">{t('members.user')}</Label>
                    <SelectField
                      id="new_member_user"
                      value={newUserId}
                      onChange={setNewUserId}
                      required
                      disabled={saving}
                    >
                      <option value="">{t('members.selectUser')}</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} · {t(`roles.${u.role}`)}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new_member_role">{t('members.roleLabel')}</Label>
                    <SelectField
                      id="new_member_role"
                      value={newRole}
                      onChange={(v) => setNewRole(v as MemberRole)}
                      disabled={saving}
                    >
                      {MEMBER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`members.role.${r}`)}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelAdd}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={saving || !newUserId}>
                    {saving ? t('common.saving') : t('common.add')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
