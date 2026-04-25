import * as React from 'react';
import { cn } from '../lib/utils';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedControlOption<T>>;
  ariaLabel?: string;
}

// Compact pill row for status / time-range filters. Replaces hand-rolled
// "two-three radio buttons styled as buttons" patterns. Use instead of
// `<input type="radio">` clusters for view filters.
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-1 p-1 rounded-md bg-muted', className)}
      {...props}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'text-xs font-medium px-3 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
