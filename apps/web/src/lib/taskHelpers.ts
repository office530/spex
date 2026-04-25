// Pure helpers for task display logic.

export interface OverdueTaskInput {
  due_date: string | null;
  status: string;
}

const COMPLETED_STATUSES = new Set(['done', 'cancelled']);

// Miro §7: tasks past their due date that aren't done or cancelled
// are considered overdue and rendered with a red accent.
export function isTaskOverdue(task: OverdueTaskInput, now: Date = new Date()): boolean {
  if (!task.due_date) return false;
  if (COMPLETED_STATUSES.has(task.status)) return false;
  return new Date(task.due_date).getTime() < now.getTime();
}
