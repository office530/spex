import * as React from 'react';
import { cn } from '../lib/utils';

// Single-source-of-truth palette. Extend StatusTone rather than defining
// per-module color maps. See PATTERNS.md §1.
export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'accent'
  | 'accent2';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
  muted: 'bg-slate-100 text-slate-600',
  accent: 'bg-violet-100 text-violet-800',
  accent2: 'bg-teal-100 text-teal-800',
};

// Centralised status → tone mapping. Add new families here when you
// introduce a new enum. Render via <StatusBadge family="..." value="..." label={t(...)}/>.
type StatusFamily =
  | 'project'
  | 'milestone_execution'
  | 'milestone_billing'
  | 'lead'
  | 'supplier_quote'
  | 'customer_quote'
  | 'supplier'
  | 'task'
  | 'task_priority'
  | 'event'
  | 'variation'
  | 'rfi'
  | 'supplier_invoice'
  | 'payment_request';

const STATUS_TONES: Record<StatusFamily, Record<string, StatusTone>> = {
  project: {
    active: 'success',
    on_hold: 'warning',
    completed: 'muted',
    cancelled: 'danger',
  },
  milestone_execution: {
    pending: 'neutral',
    in_progress: 'info',
    done: 'success',
  },
  milestone_billing: {
    not_yet_due: 'neutral',
    ready_to_bill: 'warning',
    invoiced: 'info',
    paid: 'success',
  },
  lead: {
    new: 'info',
    no_answer_1: 'warning',
    no_answer_2: 'warning',
    no_answer_3: 'warning',
    follow_up: 'accent',
    planning_meeting_scheduled: 'accent',
    awaiting_plans: 'accent',
    quote_issued: 'accent2',
    work_meeting_scheduled: 'success',
    won: 'success',
    lost: 'danger',
    not_relevant: 'muted',
  },
  supplier_quote: {
    draft: 'neutral',
    submitted: 'info',
    under_review: 'warning',
    approved: 'success',
    rejected: 'danger',
    revised: 'accent',
  },
  customer_quote: {
    draft: 'neutral',
    sent: 'info',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'muted',
  },
  supplier: {
    pending_approval: 'warning',
    active: 'success',
    blocked: 'danger',
  },
  task: {
    awaiting_execution: 'neutral',
    in_progress: 'info',
    done: 'success',
    awaiting_manager_approval: 'warning',
    cancelled: 'muted',
  },
  task_priority: {
    low: 'neutral',
    medium: 'info',
    high: 'warning',
    urgent: 'danger',
  },
  event: {
    scheduled: 'info',
    cancelled: 'muted',
    no_show: 'warning',
  },
  variation: {
    draft: 'neutral',
    pending_approval: 'warning',
    approved: 'info',
    rejected: 'danger',
    billed: 'success',
  },
  rfi: {
    open: 'warning',
    responded: 'info',
    closed: 'success',
  },
  supplier_invoice: {
    received: 'info',
    matched: 'accent',
    disputed: 'danger',
    processed: 'success',
  },
  payment_request: {
    awaiting_payment_request: 'neutral',
    awaiting_pm_approval: 'warning',
    pm_approved_awaiting_back_office: 'info',
    paid: 'success',
    rejected: 'danger',
  },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  family: StatusFamily;
  value: string;
  label: string;
}

export function StatusBadge({ family, value, label, className, ...props }: StatusBadgeProps) {
  const tone = STATUS_TONES[family][value] ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
