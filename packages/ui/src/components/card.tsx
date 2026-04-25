import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual variant.
   * - `default` (flat) — `shadow-sm`, no hover lift.
   * - `elevated` — `shadow-md` baseline, used for the sticky top regions or hero panels.
   * - `interactive` — clickable card: cursor-pointer, hover-lift, hover-border tint. Use when the
   *    whole card is a link.
   */
  variant?: 'default' | 'elevated' | 'interactive';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground transition-all',
        variant === 'default' && 'shadow-sm',
        variant === 'elevated' && 'shadow-md',
        variant === 'interactive' &&
          'shadow-sm cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref as never}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref as never}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';
