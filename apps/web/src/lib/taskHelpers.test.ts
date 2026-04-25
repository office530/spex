import { describe, expect, it } from 'vitest';
import { isTaskOverdue } from './taskHelpers';

describe('isTaskOverdue', () => {
  const NOW = new Date('2026-04-25T12:00:00.000Z');

  it('is false when there is no due date', () => {
    expect(isTaskOverdue({ due_date: null, status: 'in_progress' }, NOW)).toBe(false);
  });

  it('is false when the due date is in the future', () => {
    expect(
      isTaskOverdue(
        { due_date: '2026-05-01T00:00:00.000Z', status: 'in_progress' },
        NOW,
      ),
    ).toBe(false);
  });

  it('is true when the due date is in the past and status is open', () => {
    expect(
      isTaskOverdue(
        { due_date: '2026-04-20T00:00:00.000Z', status: 'in_progress' },
        NOW,
      ),
    ).toBe(true);
  });

  it('is false when the task is done, even if past due', () => {
    expect(
      isTaskOverdue({ due_date: '2026-04-20T00:00:00.000Z', status: 'done' }, NOW),
    ).toBe(false);
  });

  it('is false when the task is cancelled, even if past due', () => {
    expect(
      isTaskOverdue(
        { due_date: '2026-04-20T00:00:00.000Z', status: 'cancelled' },
        NOW,
      ),
    ).toBe(false);
  });

  it('is true for awaiting_manager_approval state past due', () => {
    expect(
      isTaskOverdue(
        {
          due_date: '2026-04-20T00:00:00.000Z',
          status: 'awaiting_manager_approval',
        },
        NOW,
      ),
    ).toBe(true);
  });
});
