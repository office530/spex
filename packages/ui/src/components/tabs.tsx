import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';
import { cn } from '../lib/utils';

type TabsVariant = 'pill' | 'underline';

const TabsVariantContext = React.createContext<TabsVariant>('pill');

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
}

export function Tabs({ variant = 'pill', ...props }: TabsProps) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root {...props} />
    </TabsVariantContext.Provider>
  );
}

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === 'pill'
          ? 'inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-1 overflow-x-auto'
          : 'inline-flex items-center justify-start gap-1 border-b w-full text-muted-foreground overflow-x-auto',
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Optional inline count badge (e.g. "RFI 3"). Hidden when undefined. */
  count?: number;
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, children, count, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&>svg]:h-4 [&>svg]:w-4',
        variant === 'pill'
          ? 'rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
          : "relative px-3 py-2.5 -mb-px border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 data-[state=active]:text-primary data-[state=active]:border-primary",
        className,
      )}
      {...props}
    >
      {children}
      {typeof count === 'number' && count > 0 && (
        <span
          className={cn(
            'ms-0.5 inline-flex items-center justify-center rounded-full text-[10px] font-medium px-1.5 min-w-[1.25rem] h-5 leading-none tabular-nums',
            'bg-muted text-muted-foreground',
            'group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary',
          )}
          aria-hidden
        >
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 space-y-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
