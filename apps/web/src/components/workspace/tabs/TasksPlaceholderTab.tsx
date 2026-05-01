import { EmptyState } from '@spex/ui';
import { ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TasksPlaceholderTab() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ListChecks}
      title={t('workspace.tasks.placeholderTitle')}
      description={t('workspace.tasks.placeholderDescription')}
    />
  );
}
