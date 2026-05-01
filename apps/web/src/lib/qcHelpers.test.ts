import { describe, expect, it } from 'vitest';
import {
  attentionCount,
  checksProgress,
  isQcOverdue,
  openCount,
} from './qcHelpers';

describe('qcHelpers', () => {
  describe('attentionCount', () => {
    it('counts only failed checks', () => {
      expect(
        attentionCount([
          { status: 'failed', due_date: null },
          { status: 'failed', due_date: null },
          { status: 'pending', due_date: null },
          { status: 'done', due_date: null },
        ]),
      ).toBe(2);
    });
    it('returns 0 for empty list', () => {
      expect(attentionCount([])).toBe(0);
    });
  });

  describe('openCount', () => {
    it('counts pending + in_progress + waiting', () => {
      expect(
        openCount([
          { status: 'pending', due_date: null },
          { status: 'in_progress', due_date: null },
          { status: 'waiting', due_date: null },
          { status: 'done', due_date: null },
          { status: 'failed', due_date: null },
        ]),
      ).toBe(3);
    });
  });

  describe('isQcOverdue', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    it('returns true when due_date is past + status is pending', () => {
      expect(isQcOverdue({ status: 'pending', due_date: '2026-04-25' }, now)).toBe(true);
    });
    it('returns false when due_date is in future', () => {
      expect(isQcOverdue({ status: 'pending', due_date: '2026-05-15' }, now)).toBe(false);
    });
    it('returns false when status is done even if past due', () => {
      expect(isQcOverdue({ status: 'done', due_date: '2026-04-25' }, now)).toBe(false);
    });
    it('returns false when no due_date', () => {
      expect(isQcOverdue({ status: 'pending', due_date: null }, now)).toBe(false);
    });
    it('returns false when status is failed (already flagged)', () => {
      expect(isQcOverdue({ status: 'failed', due_date: '2026-04-25' }, now)).toBe(false);
    });
  });

  describe('checksProgress', () => {
    it('returns 0 for empty list', () => {
      expect(checksProgress([])).toBe(0);
    });
    it('returns 100 when all done', () => {
      expect(
        checksProgress([
          { status: 'done', due_date: null },
          { status: 'done', due_date: null },
        ]),
      ).toBe(100);
    });
    it('returns 50 when half done', () => {
      expect(
        checksProgress([
          { status: 'done', due_date: null },
          { status: 'pending', due_date: null },
        ]),
      ).toBe(50);
    });
    it('rounds to nearest int', () => {
      expect(
        checksProgress([
          { status: 'done', due_date: null },
          { status: 'pending', due_date: null },
          { status: 'pending', due_date: null },
        ]),
      ).toBe(33);
    });
  });
});
