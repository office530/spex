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
  const { profile, user } = useAuth();
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
        <div className="flex items-center gap-2">
          {!isCreate && id && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${id}/boq`)}>
              {t('boq.manage')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/projects')} disabled={saving}>
            {t('common.back')}
          </Button>
        </div>
      </div>

      {!isCreate && id && (
        <ProjectOverviewCard
          projectId={id}
          contractValue={form.contract_value ? Number(form.contract_value) : null}
        />
      )}

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
      {!isCreate && id && <MilestonesPanel projectId={id} isAdmin={isAdmin} />}
      {!isCreate && id && (
        <VariationsPanel
          projectId={id}
          canWrite={isAdmin || (form.pm_id !== '' && form.pm_id === user?.id)}
        />
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

type ExecStatus = 'pending' | 'in_progress' | 'done';
type BillStatus = 'not_yet_due' | 'ready_to_bill' | 'invoiced' | 'paid';

const EXEC_STATUSES: ExecStatus[] = ['pending', 'in_progress', 'done'];
const BILL_STATUSES: BillStatus[] = ['not_yet_due', 'ready_to_bill', 'invoiced', 'paid'];

interface MilestoneRow {
  id: string;
  name: string;
  billing_pct: number;
  sort_order: number;
  execution_status: ExecStatus;
  billing_status: BillStatus;
}

const EXEC_COLORS: Record<ExecStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-emerald-100 text-emerald-800',
};

const BILL_COLORS: Record<BillStatus, string> = {
  not_yet_due: 'bg-gray-100 text-gray-700',
  ready_to_bill: 'bg-amber-100 text-amber-800',
  invoiced: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
};

function MilestonesPanel({ projectId, isAdmin }: { projectId: string; isAdmin: boolean }) {
  const { t } = useTranslation();
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPct, setNewPct] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from('milestones')
      .select('id, name, billing_pct, sort_order, execution_status, billing_status')
      .eq('project_id', projectId)
      .order('sort_order');
    if (error) setError(error.message);
    else setMilestones((data as MilestoneRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setAdding(true);
    setNewName('');
    setNewPct('');
    setError(null);
  }

  function cancelAdd() {
    setAdding(false);
    setError(null);
  }

  async function addMilestone(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const nextOrder = milestones.length
      ? Math.max(...milestones.map((m) => m.sort_order)) + 1
      : 0;
    const { error } = await supabase.from('milestones').insert({
      project_id: projectId,
      name: newName,
      billing_pct: Number(newPct) || 0,
      sort_order: nextOrder,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancelAdd();
    await refresh();
  }

  async function updateExec(id: string, status: ExecStatus) {
    const { error } = await supabase.from('milestones').update({ execution_status: status }).eq('id', id);
    if (error) setError(error.message);
    else await refresh();
  }

  async function updateBill(id: string, status: BillStatus) {
    const { error } = await supabase.from('milestones').update({ billing_status: status }).eq('id', id);
    if (error) setError(error.message);
    else await refresh();
  }

  async function removeMilestone(m: MilestoneRow) {
    if (!confirm(t('milestones.confirmDelete'))) return;
    const { error } = await supabase.from('milestones').delete().eq('id', m.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const totalPct = milestones.reduce((sum, m) => sum + (m.billing_pct ?? 0), 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          {t('milestones.title')}
          {milestones.length > 0 && (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              ({totalPct}%)
            </span>
          )}
        </CardTitle>
        {isAdmin && !adding && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('milestones.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : (
          <div className="divide-y">
            {adding && (
              <form onSubmit={addMilestone} className="px-6 py-4 space-y-3 bg-muted/40">
                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <div className="space-y-1">
                    <Label htmlFor="ms_name">{t('milestones.name')} *</Label>
                    <Input
                      id="ms_name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ms_pct">{t('milestones.billingPct')} *</Label>
                    <Input
                      id="ms_pct"
                      type="number"
                      min="0"
                      max="100"
                      value={newPct}
                      onChange={(e) => setNewPct(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelAdd} disabled={saving}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? t('common.saving') : t('common.add')}
                  </Button>
                </div>
              </form>
            )}
            {milestones.length === 0 && !adding ? (
              <p className="text-sm text-muted-foreground p-6">{t('milestones.empty')}</p>
            ) : (
              milestones.map((m) => (
                <div key={m.id} className="px-6 py-3 flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.billing_pct}%</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXEC_COLORS[m.execution_status]}`}>
                      {t(`milestones.execution.${m.execution_status}`)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BILL_COLORS[m.billing_status]}`}>
                      {t(`milestones.billing.${m.billing_status}`)}
                    </span>
                    {isAdmin && (
                      <>
                        <SelectField
                          id={`ms_exec_${m.id}`}
                          value={m.execution_status}
                          onChange={(v) => void updateExec(m.id, v as ExecStatus)}
                        >
                          {EXEC_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(`milestones.execution.${s}`)}
                            </option>
                          ))}
                        </SelectField>
                        <SelectField
                          id={`ms_bill_${m.id}`}
                          value={m.billing_status}
                          onChange={(v) => void updateBill(m.id, v as BillStatus)}
                        >
                          {BILL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(`milestones.billing.${s}`)}
                            </option>
                          ))}
                        </SelectField>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void removeMilestone(m)}
                        >
                          {t('common.delete')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type VariationStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'billed';

const VARIATION_STATUSES: VariationStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'billed',
];

const VARIATION_STATUS_COLORS: Record<VariationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-rose-100 text-rose-800',
  billed: 'bg-emerald-100 text-emerald-800',
};

interface VariationRow {
  id: string;
  title: string;
  description: string | null;
  amount: number | null;
  status: VariationStatus;
  approved_at: string | null;
}

function formatCurrencyILS(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

function VariationsPanel({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<VariationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    status: 'draft' as VariationStatus,
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const { data, error } = await supabase
      .from('variations')
      .select('id, title, description, amount, status, approved_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data as VariationRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startAdd() {
    setEditingId(null);
    setForm({ title: '', description: '', amount: '', status: 'draft' });
    setError(null);
    setAdding(true);
  }

  function startEdit(v: VariationRow) {
    setAdding(false);
    setEditingId(v.id);
    setForm({
      title: v.title,
      description: v.description ?? '',
      amount: v.amount != null ? String(v.amount) : '',
      status: v.status,
    });
    setError(null);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  async function saveForm(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const current = rows.find((r) => r.id === editingId);
    const transitioningToApproved =
      form.status === 'approved' && current?.status !== 'approved';
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      amount: form.amount ? Number(form.amount) : null,
      status: form.status,
    };
    if (transitioningToApproved) payload.approved_at = new Date().toISOString();
    else if (form.status !== 'approved' && form.status !== 'billed') payload.approved_at = null;
    const { error } = adding
      ? await supabase.from('variations').insert({ ...payload, project_id: projectId })
      : await supabase.from('variations').update(payload).eq('id', editingId!);
    setSaving(false);
    if (error) { setError(error.message); return; }
    cancelForm();
    await refresh();
  }

  async function removeRow(v: VariationRow) {
    if (!confirm(t('variations.confirmDelete'))) return;
    const { error } = await supabase.from('variations').delete().eq('id', v.id);
    if (error) setError(error.message);
    else await refresh();
  }

  const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  function renderForm() {
    return (
      <form onSubmit={saveForm} className="px-6 py-4 space-y-3 bg-muted/40">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="v_title">{t('variations.titleLabel')} *</Label>
            <Input
              id="v_title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="v_amount">{t('variations.amount')}</Label>
            <Input
              id="v_amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="v_status">{t('variations.statusLabel')}</Label>
            <SelectField
              id="v_status"
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v as VariationStatus }))}
              disabled={saving}
            >
              {VARIATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`variations.status.${s}`)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="v_desc">{t('variations.description')}</Label>
            <textarea
              id="v_desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancelForm} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          {t('variations.title')}
          {rows.length > 0 && (
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              ({formatCurrencyILS(total)})
            </span>
          )}
        </CardTitle>
        {canWrite && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            {t('variations.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : (
          <div className="divide-y">
            {adding && renderForm()}
            {rows.length === 0 && !adding ? (
              <p className="text-sm text-muted-foreground p-6">{t('variations.empty')}</p>
            ) : (
              rows.map((v) =>
                editingId === v.id ? (
                  <div key={v.id}>{renderForm()}</div>
                ) : (
                  <div key={v.id} className="px-6 py-3 flex items-start gap-3 flex-wrap">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{v.title}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${VARIATION_STATUS_COLORS[v.status]}`}
                        >
                          {t(`variations.status.${v.status}`)}
                        </span>
                      </div>
                      {v.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {v.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-sm font-medium">
                      {formatCurrencyILS(v.amount)}
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(v)}>
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void removeRow(v)}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    )}
                  </div>
                ),
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProjectOverviewCardProps {
  projectId: string;
  contractValue: number | null;
}

interface OverviewData {
  boqTotal: number;
  variationsTotal: number;
  milestonesTotal: number;
  milestonesDone: number;
  milestonesBilledPct: number;
}

function ProjectOverviewCard({ projectId, contractValue }: ProjectOverviewCardProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [boqRes, varsRes, msRes] = await Promise.all([
        supabase.from('boq_line_items').select('estimated_total').eq('project_id', projectId),
        supabase.from('variations').select('amount, status').eq('project_id', projectId),
        supabase
          .from('milestones')
          .select('execution_status, billing_status, billing_pct')
          .eq('project_id', projectId),
      ]);
      if (cancelled) return;
      const boqRows = (boqRes.data as Array<{ estimated_total: number | null }> | null) ?? [];
      const varRows =
        (varsRes.data as Array<{ amount: number | null; status: string }> | null) ?? [];
      const msRows =
        (msRes.data as Array<{
          execution_status: string;
          billing_status: string;
          billing_pct: number;
        }> | null) ?? [];
      setData({
        boqTotal: boqRows.reduce((s, r) => s + (r.estimated_total ?? 0), 0),
        variationsTotal: varRows
          .filter((v) => v.status === 'approved' || v.status === 'billed')
          .reduce((s, v) => s + (v.amount ?? 0), 0),
        milestonesTotal: msRows.length,
        milestonesDone: msRows.filter((m) => m.execution_status === 'done').length,
        milestonesBilledPct: msRows
          .filter((m) => m.billing_status === 'invoiced' || m.billing_status === 'paid')
          .reduce((s, m) => s + (m.billing_pct ?? 0), 0),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const tiles: Array<{ label: string; value: string; secondary?: string }> = [
    {
      label: t('projects.contractValue'),
      value: formatCurrencyILS(contractValue),
    },
    {
      label: t('projects.overview.boqTotal'),
      value: data ? formatCurrencyILS(data.boqTotal) : '—',
    },
    {
      label: t('projects.overview.variationsTotal'),
      value: data ? formatCurrencyILS(data.variationsTotal) : '—',
    },
    {
      label: t('projects.overview.milestones'),
      value: data ? `${data.milestonesDone}/${data.milestonesTotal}` : '—',
      secondary: data
        ? `${data.milestonesBilledPct}% ${t('projects.overview.billedShort')}`
        : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{tile.label}</div>
            <div className="text-lg font-semibold mt-1">{tile.value}</div>
            {tile.secondary && (
              <div className="text-xs text-muted-foreground mt-0.5">{tile.secondary}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
