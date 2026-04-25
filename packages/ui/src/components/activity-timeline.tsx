import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export type TimelineIconTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent';

const TONE_CLASSES: Record<TimelineIconTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  accent: 'bg-violet-100 text-violet-700',
};

// Vertical timeline. Use for activity logs, lead interaction history,
// ticket updates, audit trails. RTL-aware: the rail sits on the start
// (visually right in Hebrew) edge; items extend toward the end (left).
export function ActivityTimeline({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLOListElement>) {
  return (
    <ol className={cn('relative', className)} {...props}>
      {children}
    </ol>
  );
}

export interface ActivityTimelineGroupProps
  extends React.HTMLAttributes<HTMLLIElement> {
  label: React.ReactNode;
}

export function ActivityTimelineGroup({
  className,
  label,
  children,
  ...props
}: ActivityTimelineGroupProps) {
  return (
    <li className={cn('mb-4', className)} {...props}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {label}
      </div>
      <ol className="relative">{children}</ol>
    </li>
  );
}

export interface ActivityTimelineItemProps
  extends Omit<React.HTMLAttributes<HTMLLIElement>, 'children'> {
  icon: LucideIcon;
  iconTone?: TimelineIconTone;
  timestamp?: React.ReactNode;
  /** Set true on the last item in a group to suppress the trailing rail line. */
  last?: boolean;
  children: React.ReactNode;
}

export function ActivityTimelineItem({
  icon: Icon,
  iconTone = 'neutral',
  timestamp,
  last,
  className,
  children,
  ...props
}: ActivityTimelineItemProps) {
  return (
    <li className={cn('relative ps-10 pb-4', className)} {...props}>
      {!last && (
        <span
          aria-hidden
          className="absolute start-3 top-7 bottom-0 w-px bg-border"
        />
      )}
      <span
        aria-hidden
        className={cn(
          'absolute start-0 top-0 h-6 w-6 rounded-full grid place-items-center ring-4 ring-background',
          TONE_CLASSES[iconTone],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="text-sm leading-snug">{children}</div>
      {timestamp && (
        <div className="text-xs text-muted-foreground mt-0.5">{timestamp}</div>
      )}
    </li>
  );
}
