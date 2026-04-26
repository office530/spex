import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  DatePicker,
  EmptyState,
  Input,
  Label,
  SkeletonRows,
  StatusBadge,
} from '@spex/ui';
import { HardHat, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';

type WorkLogStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';

interface WorkLogRow {
  id: string;
  work_date: string;
  hours: number | null;
  crew_size: number | null;
  status: WorkLogStatus;
  notes: string | null;
  created_by: string | null;
  creator: { full_name: string } | null;
}

interface WorkLogPanelProps {
  projectId: string;
  canWrite: boolean;
}

interface FormState {
  work_date: string;
  hours: string;
  crew_size: string;
  status: WorkLogStatus;
  notes: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const empty: FormState = {
  work_date: todayIso(),
  hours: '',
  crew_size: '',
  status: 'planned',
  notes: '',
};

const STATUS_OPTIONS: WorkLogStatus[] = ['planned', 'in_progress', 'done', 'cancelled'];

export function WorkLogPanel({ projectId, canWrite }: WorkLogPanelProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<WorkLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(empty);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_logs')
      .select(
        'id, work_date, hours, crew_size, status, notes, created_by, creator:user_profiles!work_logs_created_by_fkey(full_name)',
      )
      .eq('project_id', projectId)
      .order('work_date', { ascending: false })
      .limit(50);
    if (error) {
      if (import.meta.env.DEV) console.error('[work-logs] load failed', error);
    }
    setRows((data as unknown as WorkLogRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('work_logs').insert({
      project_id: projectId,
      work_date: form.work_date,
      hours: form.hours ? Number(form.hours) : null,
      crew_size: form.crew_size ? Number(form.crew_size) : null,
      status: form.status,
      notes: form.notes || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(t('common.errorToast'));
      return;
    }
    toast.success(t('common.createdToast'));
    setForm(empty);
    setAdding(false);
    void load();
  }

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }),
    [i18n.language],
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">{t('workLog.title')}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{t('workLog.subtitle')}</p>
        </div>
        {canWrite && !adding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-4 w-4" />
            {t('workLog.add')}
          </Button>
        )}
      </CardHeader>

      {adding && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="wl-date">{t('workLog.field.date')} *</Label>
                <DatePicker
                  id="wl-date"
                  value={form.work_date}
                  onChange={(v) => setForm({ ...form, work_date: v ?? todayIso() })}
                />
              </div>
              <div>
                <Label htmlFor="wl-hours">{t('workLog.field.hours')}</Label>
                <Input
                  id="wl-hours"
                  type="number"
                  step="0.25"
                  min="0"
                  inputMode="decimal"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="wl-crew">{t('workLog.field.crewSize')}</Label>
                <Input
                  id="wl-crew"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.crew_size}
                  onChange={(e) => setForm({ ...form, crew_size: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="wl-status">{t('workLog.field.status')}</Label>
              <select
                id="wl-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as WorkLogStatus })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`workLog.status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="wl-notes">{t('workLog.field.notes')}</Label>
              <Input
                id="wl-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('workLog.notesPlaceholder')}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm(empty);
                setAdding(false);
              }}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('common.save')}
            </Button>
          </CardFooter>
        </form>
      )}

      <CardContent className="p-0">
        {loading ? (
          <SkeletonRows count={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={HardHat}
            title={t('workLog.empty')}
            cta={canWrite && !adding ? { label: t('workLog.add'), onClick: () => setAdding(true) } : undefined}
          />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="px-6 py-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {dateFmt.format(new Date(r.work_date))}
                    </span>
                    <StatusBadge
                      family="work_log"
                      value={r.status}
                      label={t(`workLog.status.${r.status}`)}
                    />
                    {r.hours != null && (
                      <span className="text-xs text-muted-foreground">
                        {t('workLog.hoursValue', { count: r.hours })}
                      </span>
                    )}
                    {r.crew_size != null && (
                      <span className="text-xs text-muted-foreground">
                        {t('workLog.crewValue', { count: r.crew_size })}
                      </span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                      {r.notes}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.creator?.full_name ?? '—'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
