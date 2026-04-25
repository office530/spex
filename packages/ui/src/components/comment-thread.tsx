import * as React from 'react';
import { Avatar } from './avatar';
import { cn } from '../lib/utils';

// Threaded comment list. Use for ticket updates, supplier-quote
// discussion, RFI responses. Single-level reply nesting (depth 2 max
// — deeper threads become unreadable on mobile).

export function CommentThread({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
    </div>
  );
}

export interface CommentProps extends React.HTMLAttributes<HTMLDivElement> {
  authorName: string;
  timestamp?: React.ReactNode;
  /** When true, renders an indented reply (depth 2). */
  reply?: boolean;
}

export function Comment({
  authorName,
  timestamp,
  reply,
  className,
  children,
  ...props
}: CommentProps) {
  return (
    <div
      className={cn('flex gap-3 items-start', reply && 'ms-10', className)}
      {...props}
    >
      <Avatar name={authorName} size="sm" className="shrink-0" />
      <div className="flex-1 min-w-0 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium">{authorName}</span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          )}
        </div>
        <div className="text-sm mt-0.5 whitespace-pre-line break-words">
          {children}
        </div>
      </div>
    </div>
  );
}
