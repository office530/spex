import * as React from 'react';
import { cn } from '../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted skeleton-shimmer',
        // motion-safe / reduced-motion handled by the .skeleton-shimmer
        // utility in apps/web/src/index.css.
        className,
      )}
      {...props}
    />
  );
}

export interface SkeletonRowsProps {
  count?: number;
  className?: string;
}

export function SkeletonRows({ count = 5, className }: SkeletonRowsProps) {
  return (
    <div className={cn('divide-y', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
