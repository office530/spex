import { describe, expect, it } from 'vitest';
import {
  formatCurrencyILS,
  fromDateInput,
  fromDatetimeInput,
  toDateInput,
  toDatetimeInput,
} from './format';

describe('formatCurrencyILS', () => {
  it('formats integers with the ILS symbol', () => {
    const formatted = formatCurrencyILS(1234);
    expect(formatted).toContain('1,234');
    expect(formatted).toMatch(/₪/);
  });

  it('returns the placeholder for null and undefined', () => {
    expect(formatCurrencyILS(null)).toBe('—');
    expect(formatCurrencyILS(undefined)).toBe('—');
  });

  it('respects a custom empty placeholder', () => {
    expect(formatCurrencyILS(null, 'N/A')).toBe('N/A');
  });

  it('renders zero as a real value, not the placeholder', () => {
    const formatted = formatCurrencyILS(0);
    expect(formatted).not.toBe('—');
    expect(formatted).toMatch(/0/);
  });
});

describe('toDatetimeInput / fromDatetimeInput', () => {
  it('truncates ISO strings down to minutes for <input type=datetime-local>', () => {
    expect(toDatetimeInput('2026-04-25T10:30:45.000Z')).toBe('2026-04-25T10:30');
  });

  it('returns empty string for null', () => {
    expect(toDatetimeInput(null)).toBe('');
  });

  it('round-trips a value back to ISO via fromDatetimeInput', () => {
    const out = fromDatetimeInput('2026-04-25T10:30');
    expect(out).not.toBeNull();
    expect(typeof out).toBe('string');
    expect(out).toMatch(/^2026-04-25T/);
  });

  it('returns null for empty input', () => {
    expect(fromDatetimeInput('')).toBeNull();
  });
});

describe('toDateInput / fromDateInput', () => {
  it('truncates ISO strings to YYYY-MM-DD for <input type=date>', () => {
    expect(toDateInput('2026-04-25T10:30:45.000Z')).toBe('2026-04-25');
  });

  it('returns empty string for null', () => {
    expect(toDateInput(null)).toBe('');
  });

  it('returns ISO for valid date input', () => {
    const out = fromDateInput('2026-04-25');
    expect(out).not.toBeNull();
    expect(out).toMatch(/^2026-04-25T/);
  });

  it('returns null for empty input', () => {
    expect(fromDateInput('')).toBeNull();
  });
});
