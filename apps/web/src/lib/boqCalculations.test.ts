import { describe, expect, it } from 'vitest';
import {
  computeChapterTotal,
  computeLineTotal,
  computeProjectTotal,
} from './boqCalculations';

describe('computeLineTotal', () => {
  it('multiplies quantity by unit price', () => {
    expect(computeLineTotal(10, 25)).toBe(250);
  });

  it('returns null when quantity is null', () => {
    expect(computeLineTotal(null, 25)).toBeNull();
  });

  it('returns null when unit price is null', () => {
    expect(computeLineTotal(10, null)).toBeNull();
  });

  it('handles zero values without returning null', () => {
    expect(computeLineTotal(0, 25)).toBe(0);
    expect(computeLineTotal(10, 0)).toBe(0);
  });

  it('supports decimal quantities', () => {
    expect(computeLineTotal(2.5, 100)).toBe(250);
  });
});

describe('computeChapterTotal', () => {
  it('sums estimated_total across items', () => {
    expect(
      computeChapterTotal([
        { quantity: 10, unit_price: 25, estimated_total: 250 },
        { quantity: 4, unit_price: 100, estimated_total: 400 },
      ]),
    ).toBe(650);
  });

  it('treats null estimated_total as zero', () => {
    expect(
      computeChapterTotal([
        { quantity: 10, unit_price: 25, estimated_total: 250 },
        { quantity: null, unit_price: null, estimated_total: null },
      ]),
    ).toBe(250);
  });

  it('returns zero for an empty chapter', () => {
    expect(computeChapterTotal([])).toBe(0);
  });
});

describe('computeProjectTotal', () => {
  it('sums totals across all chapters', () => {
    expect(
      computeProjectTotal([
        {
          items: [
            { quantity: 10, unit_price: 25, estimated_total: 250 },
            { quantity: 4, unit_price: 100, estimated_total: 400 },
          ],
        },
        {
          items: [{ quantity: 5, unit_price: 20, estimated_total: 100 }],
        },
      ]),
    ).toBe(750);
  });

  it('returns zero for a project with no chapters', () => {
    expect(computeProjectTotal([])).toBe(0);
  });
});
