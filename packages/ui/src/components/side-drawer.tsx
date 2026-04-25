import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils';

// SideDrawer: a right-slide (RTL: visually right = "start" in Hebrew flow)
// detail pane built on Radix Dialog. Use for task/ticket/supplier quick-look
// instead of full-page navigation. ESC-closes, overlay-clicks-close, focus-trapped.
//
// Example:
//   <SideDrawer open={isOpen} onOpenChange={setOpen} width="md">
//     <SideDrawerHeader>
//       <SideDrawerTitle>פרטי משימה</SideDrawerTitle>
//       <SideDrawerDescription>{task.title}</SideDrawerDescription>
//     </SideDrawerHeader>
//     <SideDrawerBody>{...}</SideDrawerBody>
//     <SideDrawerFooter>{...}</SideDrawerFooter>
//   </SideDrawer>

const SideDrawer = DialogPrimitive.Root;
const SideDrawerTrigger = DialogPrimitive.Trigger;
const SideDrawerClose = DialogPrimitive.Close;

const widthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
} as const;

interface SideDrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  width?: keyof typeof widthClasses;
  side?: 'start' | 'end';
}

const SideDrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SideDrawerContentProps
>(({ className, children, width = 'md', side = 'start', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 z-50 flex flex-col w-full bg-background shadow-xl border',
        widthClasses[width],
        side === 'start' ? 'start-0 border-e' : 'end-0 border-s',
        side === 'start'
          ? 'data-[state=open]:animate-in data-[state=open]:slide-in-from-right'
          : 'data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
        side === 'start'
          ? 'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right'
          : 'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
        'duration-200',
        className,
      )}
      {...props}
    >
      <DialogPrimitive.Close
        className="absolute end-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="סגור"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SideDrawerContent.displayName = 'SideDrawerContent';

const SideDrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col gap-1 border-b px-6 py-4 pe-12', className)}
    {...props}
  />
);
SideDrawerHeader.displayName = 'SideDrawerHeader';

const SideDrawerBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)} {...props} />
);
SideDrawerBody.displayName = 'SideDrawerBody';

const SideDrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-end gap-2 border-t px-6 py-3', className)}
    {...props}
  />
);
SideDrawerFooter.displayName = 'SideDrawerFooter';

const SideDrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold leading-tight', className)}
    {...props}
  />
));
SideDrawerTitle.displayName = 'SideDrawerTitle';

const SideDrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SideDrawerDescription.displayName = 'SideDrawerDescription';

export {
  SideDrawer,
  SideDrawerTrigger,
  SideDrawerClose,
  SideDrawerContent,
  SideDrawerHeader,
  SideDrawerBody,
  SideDrawerFooter,
  SideDrawerTitle,
  SideDrawerDescription,
};
