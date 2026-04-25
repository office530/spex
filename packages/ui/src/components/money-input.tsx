import * as React from 'react';
import { Input } from './input';
import { cn } from '../lib/utils';
import { formatCurrencyILS } from '../lib/format';

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null;
  onChange: (value: number | null) => void;
  /** ILS currency display on blur. Defaults to true. Pass false to show plain number. */
  showCurrencyOnBlur?: boolean;
}

const NON_DIGIT = /[^\d.\-]/g;

function parseMoney(input: string): number | null {
  if (!input || !input.trim()) return null;
  const cleaned = input.replace(NON_DIGIT, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Money input with ILS-formatted display on blur. Strips non-digits on paste.
// Stores plain numeric value via onChange; visual representation handled internally.
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, showCurrencyOnBlur = true, className, onBlur, onFocus, onPaste, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [draft, setDraft] = React.useState<string>('');

    React.useEffect(() => {
      if (focused) return;
      setDraft(value == null ? '' : showCurrencyOnBlur ? formatCurrencyILS(value) : String(value));
    }, [value, focused, showCurrencyOnBlur]);

    return (
      <Input
        ref={ref}
        inputMode="decimal"
        dir="ltr"
        className={cn('text-end', className)}
        value={focused ? draft : draft}
        onFocus={(e) => {
          setFocused(true);
          // Switch from formatted to plain digits while editing
          setDraft(value == null ? '' : String(value));
          onFocus?.(e);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          const parsed = parseMoney(next);
          onChange(parsed);
        }}
        onBlur={(e) => {
          setFocused(false);
          if (value != null && showCurrencyOnBlur) {
            setDraft(formatCurrencyILS(value));
          }
          onBlur?.(e);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          const cleaned = text.replace(NON_DIGIT, '');
          if (cleaned !== text) {
            e.preventDefault();
            const parsed = parseMoney(cleaned);
            setDraft(cleaned);
            onChange(parsed);
          }
          onPaste?.(e);
        }}
        {...props}
      />
    );
  },
);
MoneyInput.displayName = 'MoneyInput';
