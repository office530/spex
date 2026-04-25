import { ArrowLeft } from 'lucide-react';
import * as React from 'react';
import { DatePicker } from './date-picker';
import { cn } from '../lib/utils';

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  fromLabel?: string;
  toLabel?: string;
  disabled?: boolean;
  locale?: 'he' | 'en';
  className?: string;
}

// Two linked DatePickers. Validates that `to >= from` — clears `to` if user
// picks a `from` that's after the existing `to`. Use for invoice filters,
// Reports date ranges, ActivityLog windows.
export function DateRangePicker({
  value,
  onChange,
  fromPlaceholder = 'מ־',
  toPlaceholder = 'עד',
  fromLabel,
  toLabel,
  disabled,
  locale = 'he',
  className,
}: DateRangePickerProps) {
  const handleFromChange = (next: string | null) => {
    if (next && value.to && next > value.to) {
      onChange({ from: next, to: null });
    } else {
      onChange({ ...value, from: next });
    }
  };

  const handleToChange = (next: string | null) => {
    if (next && value.from && next < value.from) {
      onChange({ from: value.from, to: value.from });
    } else {
      onChange({ ...value, to: next });
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <DatePicker
        value={value.from}
        onChange={handleFromChange}
        placeholder={fromPlaceholder}
        triggerLabel={fromLabel}
        disabled={disabled}
        locale={locale}
      />
      <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <DatePicker
        value={value.to}
        onChange={handleToChange}
        placeholder={toPlaceholder}
        triggerLabel={toLabel}
        disabled={disabled}
        locale={locale}
      />
    </div>
  );
}
