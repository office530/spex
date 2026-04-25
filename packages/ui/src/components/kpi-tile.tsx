import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AnimatedNumber } from './animated-number';
import { cn } from '../lib/utils';
import { Card, CardContent } from './card';

export type IconTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'accent2';

const ICON_TONE_CLASSES: Record<IconTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  accent: 'bg-violet-100 text-violet-700',
  accent2: 'bg-teal-100 text-teal-700',
};

export interface KpiTileProps {
  icon: LucideIcon;
  iconTone?: IconTone;
  label: string;
  value: string | number | null | undefined;
  /** When provided, the displayed `value` is animated as a rolling number. */
  numericValue?: number;
  /** Required formatter when `numericValue` is provided. */
  format?: (n: number) => string;
  footer?: ReactNode;
  className?: string;
}

export function KpiTile({
  icon: Icon,
  iconTone = 'neutral',
  label,
  value,
  numericValue,
  format,
  footer,
  className,
}: KpiTileProps) {
  const animated = numericValue != null && format != null;
  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4',
              ICON_TONE_CLASSES[iconTone],
            )}
          >
            <Icon />
          </div>
        </div>
        <div className="text-2xl font-semibold">
          {animated ? (
            <AnimatedNumber value={numericValue!} format={format!} />
          ) : (
            (value ?? '—')
          )}
        </div>
        {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}

export interface KpiDeltaProps {
  delta: number;
  suffix?: string;
  className?: string;
}

export function KpiDelta({ delta, suffix, className }: KpiDeltaProps) {
  if (delta === 0) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        {suffix ?? '—'}
      </span>
    );
  }
  const positive = delta > 0;
  const Arrow = positive ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        positive ? 'text-emerald-700' : 'text-rose-700',
        className,
      )}
    >
      <Arrow className="h-3 w-3" />
      {positive ? '+' : ''}
      {delta}
      {suffix && <span className="text-muted-foreground ms-1">{suffix}</span>}
    </span>
  );
}
