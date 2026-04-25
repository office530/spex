// Pure helpers for BoQ amount aggregation.

export interface BoqLineItem {
  quantity: number | null;
  unit_price: number | null;
  estimated_total: number | null;
}

export interface BoqChapter {
  items: BoqLineItem[];
}

// estimated_total is persisted, but a clean recompute is needed for the
// inline editor where qty/unit_price are dirty before save.
export function computeLineTotal(
  quantity: number | null,
  unitPrice: number | null,
): number | null {
  if (quantity == null || unitPrice == null) return null;
  return quantity * unitPrice;
}

export function computeChapterTotal(items: BoqLineItem[]): number {
  return items.reduce((sum, i) => sum + (i.estimated_total ?? 0), 0);
}

export function computeProjectTotal(chapters: BoqChapter[]): number {
  return chapters.reduce((sum, c) => sum + computeChapterTotal(c.items), 0);
}
