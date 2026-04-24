import type { LucideIcon } from 'lucide-react';
import { Button } from './button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-10 gap-3 ${className ?? ''}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
        )}
      </div>
      {cta && (
        <Button size="sm" variant="outline" onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}
