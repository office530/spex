export function formatCurrencyILS(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function toDatetimeInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 16);
}

export function fromDatetimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
