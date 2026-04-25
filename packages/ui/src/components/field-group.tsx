import * as React from 'react';
import { cn } from '../lib/utils';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** When true, omits the bottom border separator. */
  last?: boolean;
}

// DESIGN.md §11 / PATTERNS.md §7 — group form fields into a section with a
// label + optional helper description. Forms with >5 fields should use this.
export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, label, description, last, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid gap-4 sm:grid-cols-[200px_1fr] sm:gap-6 py-5',
        !last && 'border-b border-border',
        className,
      )}
      {...props}
    >
      {(label || description) && (
        <div className="space-y-1">
          {label && <div className="text-sm font-medium">{label}</div>}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4 min-w-0">{children}</div>
    </div>
  ),
);
FieldGroup.displayName = 'FieldGroup';
