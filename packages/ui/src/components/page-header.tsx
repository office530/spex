import { ArrowRight } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';
import { cn } from '../lib/utils';

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { onClick?: () => void; label?: string; href?: string };
}

// PATTERNS.md §8 — standard page-shell header. Use on every list/edit page
// so the title row stays consistent. RTL: "back" arrow points right.
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, subtitle, actions, back, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-end justify-between gap-4 flex-wrap', className)}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        {back && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={back.onClick}
            asChild={Boolean(back.href)}
            className="-ms-2 text-muted-foreground hover:text-foreground gap-1.5 px-2"
            aria-label={back.label ?? 'חזרה'}
          >
            {back.href ? (
              <a href={back.href}>
                <ArrowRight className="h-4 w-4" />
                {back.label ?? 'חזרה'}
              </a>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                {back.label ?? 'חזרה'}
              </>
            )}
          </Button>
        )}
        <h1 className="text-2xl font-bold truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  ),
);
PageHeader.displayName = 'PageHeader';
