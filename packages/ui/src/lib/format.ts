export function formatCurrencyILS(value: number | null | undefined, emptyText = '—'): string {
  if (value == null) return emptyText;
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

export function toDateInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function fromDateInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
