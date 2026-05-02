import { Button, Input, Label } from '@spex/ui';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export interface LineDraft {
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  notes: string;
}

interface LineFormProps {
  initial: LineDraft;
  saving: boolean;
  onSubmit: (draft: LineDraft) => void | Promise<void>;
  onCancel: () => void;
  compact?: boolean;
}

export function LineForm({
  initial,
  saving,
  onSubmit,
  onCancel,
  compact = false,
}: LineFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<LineDraft>(initial);

  function handle(e: FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return;
    void onSubmit({
      description: draft.description.trim(),
      unit: draft.unit.trim(),
      quantity: draft.quantity.trim(),
      unit_price: draft.unit_price.trim(),
      notes: draft.notes,
    });
  }

  const labelCls = compact
    ? 'text-[10px] uppercase tracking-wider text-slate-500'
    : 'text-xs font-medium text-slate-700';
  const inputSize = compact ? 'text-sm' : '';

  return (
    <form onSubmit={handle} className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className="space-y-1">
        <Label htmlFor="line-desc" className={labelCls}>
          {t('workspace.lineForm.description')} *
        </Label>
        <Input
          id="line-desc"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className={inputSize}
          autoFocus
          required
        />
      </div>
      <div className={`grid grid-cols-3 ${compact ? 'gap-1' : 'gap-3'}`}>
        <div className="space-y-1">
          <Label htmlFor="line-qty" className={labelCls}>
            {t('workspace.lineForm.quantity')}
          </Label>
          <Input
            id="line-qty"
            type="number"
            min="0"
            step="any"
            value={draft.quantity}
            onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
            className={inputSize}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="line-unit" className={labelCls}>
            {t('workspace.lineForm.unit')}
          </Label>
          <Input
            id="line-unit"
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
            className={inputSize}
            placeholder={t('workspace.lineForm.unitPlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="line-price" className={labelCls}>
            {t('workspace.lineForm.unitPrice')}
          </Label>
          <Input
            id="line-price"
            type="number"
            min="0"
            value={draft.unit_price}
            onChange={(e) => setDraft({ ...draft, unit_price: e.target.value })}
            className={inputSize}
          />
        </div>
      </div>
      {!compact && (
        <div className="space-y-1">
          <Label htmlFor="line-notes" className={labelCls}>
            {t('workspace.lineForm.notesLabel')}
          </Label>
          <textarea
            id="line-notes"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder={t('workspace.lineForm.notesPlaceholder')}
            rows={4}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-y min-h-[80px]"
          />
        </div>
      )}
      <div className={`flex justify-end ${compact ? 'gap-1' : 'gap-2'}`}>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
