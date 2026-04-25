import { ChevronLeft } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils';

// Breadcrumbs — RTL: chevrons point LEFT (toward "deeper" leaf in Hebrew flow,
// so the trail reads right-to-left from root to current).
//
// Example:
//   <Breadcrumb>
//     <BreadcrumbItem href="/projects">פרויקטים</BreadcrumbItem>
//     <BreadcrumbItem href="/projects/abc">דירת גני תקווה</BreadcrumbItem>
//     <BreadcrumbItem current>אבני דרך</BreadcrumbItem>
//   </Breadcrumb>

export const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <nav
      ref={ref}
      aria-label="ניווט שולי"
      className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}
      {...props}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((child, idx) => (
          <React.Fragment key={idx}>
            <li>{child}</li>
            {idx < items.length - 1 && (
              <li aria-hidden className="text-muted-foreground/50">
                <ChevronLeft className="h-3 w-3" />
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
});
Breadcrumb.displayName = 'Breadcrumb';

export interface BreadcrumbItemProps
  extends Omit<React.HTMLAttributes<HTMLAnchorElement>, 'href'> {
  href?: string;
  current?: boolean;
}

export const BreadcrumbItem = React.forwardRef<HTMLAnchorElement, BreadcrumbItemProps>(
  ({ className, href, current, children, ...props }, ref) => {
    if (current || !href) {
      return (
        <span
          aria-current={current ? 'page' : undefined}
          className={cn('text-foreground font-medium', className)}
        >
          {children}
        </span>
      );
    }
    return (
      <a
        ref={ref}
        href={href}
        className={cn('hover:text-foreground transition-colors', className)}
        {...props}
      >
        {children}
      </a>
    );
  },
);
BreadcrumbItem.displayName = 'BreadcrumbItem';
