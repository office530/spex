import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
};

// Deterministic color for a given name — keeps the same person the same tone
// across the app. 8 tones drawn from the shared StatusTone palette.
const TONE_CLASSES = [
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
  'bg-slate-200 text-slate-700',
  'bg-indigo-100 text-indigo-800',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function initials(name: string): string {
  if (!name) return '·';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export interface AvatarProps {
  name: string;
  title?: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name, title, size = 'sm', className }: AvatarProps) {
  const tone = TONE_CLASSES[hash(name) % TONE_CLASSES.length];
  return (
    <span
      title={title ?? name}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium select-none',
        SIZE_CLASSES[size],
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export interface AvatarStackProps {
  names: string[];
  max?: number;
  size?: AvatarSize;
  className?: string;
  /** rendered after the stack; common use: a count label */
  suffix?: ReactNode;
}

export function AvatarStack({
  names,
  max = 4,
  size = 'sm',
  className,
  suffix,
}: AvatarStackProps) {
  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;
  return (
    <div className={cn('inline-flex items-center', className)}>
      <div className="flex -space-x-1.5 rtl:space-x-reverse">
        {visible.map((n, i) => (
          <Avatar
            key={`${n}-${i}`}
            name={n}
            size={size}
            className="ring-2 ring-background"
          />
        ))}
        {overflow > 0 && (
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full ring-2 ring-background bg-muted text-muted-foreground font-medium',
              SIZE_CLASSES[size],
            )}
          >
            +{overflow}
          </span>
        )}
      </div>
      {suffix && <span className="ms-2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}
