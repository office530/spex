import { he } from 'date-fns/locale/he';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { cn } from '../lib/utils';

export interface DatePickerProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  locale?: 'he' | 'en';
  id?: string;
  className?: string;
  ariaLabel?: string;
  clearLabel?: string;
  doneLabel?: string;
  triggerLabel?: string;
}

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = '—',
  disabled,
  locale = 'he',
  id,
  className,
  ariaLabel,
  clearLabel = 'נקה',
  doneLabel = 'אישור',
  triggerLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = toDate(value);
  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );
  const display = date ? dateFmt.format(date) : placeholder;

  const dayPickerLocale = locale === 'he' ? he : undefined;
  const dayPickerProps: DayPickerProps = {
    mode: 'single',
    selected: date,
    onSelect: (next) => {
      if (next) {
        onChange(toIsoDate(next));
        setOpen(false);
      }
    },
    locale: dayPickerLocale,
    dir: locale === 'he' ? 'rtl' : 'ltr',
    showOutsideDays: true,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel ?? triggerLabel ?? display}
        className={cn(
          'justify-start gap-2 font-normal',
          !date && 'text-muted-foreground',
          className,
        )}
      >
        <CalendarIcon className="h-4 w-4" />
        {display}
      </Button>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle>{triggerLabel ?? placeholder}</DialogTitle>
        </DialogHeader>
        <DayPicker {...dayPickerProps} />
        <DialogFooter>
          {date && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              {clearLabel}
            </Button>
          )}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {doneLabel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
