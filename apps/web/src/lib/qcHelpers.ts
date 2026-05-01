// Pure helpers for QC check display + aggregation. No I/O.

export type QcCheckStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'waiting';

export interface QcCheckLite {
  status: QcCheckStatus;
  due_date: string | null;
}

const ATTENTION_STATUSES = new Set<QcCheckStatus>(['failed']);
const OPEN_STATUSES = new Set<QcCheckStatus>(['pending', 'in_progress', 'waiting']);

export function attentionCount(checks: QcCheckLite[]): number {
  return checks.filter((c) => ATTENTION_STATUSES.has(c.status)).length;
}

export function openCount(checks: QcCheckLite[]): number {
  return checks.filter((c) => OPEN_STATUSES.has(c.status)).length;
}

export function isQcOverdue(check: QcCheckLite, now: Date = new Date()): boolean {
  if (!check.due_date) return false;
  if (!OPEN_STATUSES.has(check.status)) return false;
  return new Date(check.due_date).getTime() < now.getTime();
}

// Status transition rules — used by the SegmentedControl in QcTab.
// Currently permissive: any status can move to any other status.
// Tightening (e.g. only PM can flip to 'failed') happens at RLS-level + UI guards.
export function canTransition(_from: QcCheckStatus, _to: QcCheckStatus): boolean {
  return true;
}

// Whether a status counts as "the work was completed" — used for progress calc.
export function isCompletedStatus(status: QcCheckStatus): boolean {
  return status === 'done';
}

// Aggregate a list of checks to a single line-item progress percentage based on
// completion. 0% if no checks; otherwise checks-done / total × 100.
export function checksProgress(checks: QcCheckLite[]): number {
  if (checks.length === 0) return 0;
  const done = checks.filter((c) => isCompletedStatus(c.status)).length;
  return Math.round((done / checks.length) * 100);
}
