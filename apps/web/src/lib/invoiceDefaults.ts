// Pure helpers for customer-invoice defaulting logic.
// Kept here (not inside a panel component) so they can be unit-tested
// without React rendering.

export interface DueDateInput {
  status: string;
  dueDate: string;
  issuedAt: string;
}

// Miro §5: when an invoice flips to 'issued' with no explicit due date,
// default the due date to 5 days after issuance (or 5 days from `now`
// when `issuedAt` is also blank).
//
// Returns an ISO date string (YYYY-MM-DD) or the original `dueDate`
// when no defaulting applies.
export function defaultInvoiceDueDate(
  input: DueDateInput,
  now: Date = new Date(),
): string {
  if (input.status !== 'issued' || input.dueDate) return input.dueDate;
  const base = input.issuedAt ? new Date(input.issuedAt) : new Date(now);
  const due = new Date(base);
  due.setDate(due.getDate() + 5);
  return due.toISOString().slice(0, 10);
}
