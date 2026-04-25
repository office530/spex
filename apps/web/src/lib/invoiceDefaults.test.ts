import { describe, expect, it } from 'vitest';
import { defaultInvoiceDueDate } from './invoiceDefaults';

describe('defaultInvoiceDueDate', () => {
  const NOW = new Date('2026-04-25T12:00:00.000Z');

  it('returns the provided due date when status is not issued', () => {
    expect(
      defaultInvoiceDueDate({ status: 'awaiting_issuance', dueDate: '', issuedAt: '' }, NOW),
    ).toBe('');
  });

  it('preserves an explicit due date even when issued', () => {
    expect(
      defaultInvoiceDueDate(
        { status: 'issued', dueDate: '2026-05-01', issuedAt: '2026-04-25' },
        NOW,
      ),
    ).toBe('2026-05-01');
  });

  it('defaults to 5 days after issuance when issued + no due date', () => {
    expect(
      defaultInvoiceDueDate(
        { status: 'issued', dueDate: '', issuedAt: '2026-04-25' },
        NOW,
      ),
    ).toBe('2026-04-30');
  });

  it('defaults to 5 days from now when both due date and issued_at are blank', () => {
    expect(
      defaultInvoiceDueDate({ status: 'issued', dueDate: '', issuedAt: '' }, NOW),
    ).toBe('2026-04-30');
  });

  it('rolls month boundaries correctly', () => {
    expect(
      defaultInvoiceDueDate(
        { status: 'issued', dueDate: '', issuedAt: '2026-04-28' },
        NOW,
      ),
    ).toBe('2026-05-03');
  });
});
