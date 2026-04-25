import { useTranslation } from 'react-i18next';
import { useRoleGroup } from '../auth/useRoleGroup';
import { BackOfficeDashboard } from './dashboard/BackOfficeDashboard';
import { ForemanDashboard } from './dashboard/ForemanDashboard';
import { PmDashboard } from './dashboard/PmDashboard';

// Dashboard router — picks one of three role-aware variants.
// CEO/VP/CFO/Office Manager → finance health + portfolio overview
// PM                        → my projects + my tasks + milestones due ≤ 14d
// Foreman                   → today's tasks + work log shortcut
export function DashboardPage() {
  const { t } = useTranslation();
  const group = useRoleGroup();

  if (group === 'back_office') return <BackOfficeDashboard />;
  if (group === 'pm') return <PmDashboard />;
  if (group === 'foreman') return <ForemanDashboard />;

  return (
    <p className="text-sm text-muted-foreground py-12 text-center">{t('common.loading')}</p>
  );
}
