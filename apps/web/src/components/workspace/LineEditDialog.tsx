import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@spex/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineForm, type LineDraft } from './LineForm';

interface LineEditDialogProps {
  open: boolean;
  onClose: () => void;
  initial: LineDraft;
  onSubmit: (draft: LineDraft) => Promise<void>;
}

export function LineEditDialog({ open, onClose, initial, onSubmit }: LineEditDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(draft: LineDraft) {
    setSaving(true);
    try {
      await onSubmit(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('workspace.lineEditDialog.title')}</DialogTitle>
          <DialogDescription>{t('workspace.lineEditDialog.description')}</DialogDescription>
        </DialogHeader>
        <LineForm
          initial={initial}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
