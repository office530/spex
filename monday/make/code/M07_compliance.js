// M07 — daily supplier compliance (06:00). Status is written here, not by a formula (§5.3).
// input: vendors (items_page items with column_values: vendor_type, insurance_exp, wht_exp, books_exp,
//        manpower_exp, compliance, pay_block), today (YYYY-MM-DD, optional for tests)
// Rules: required certificates = insurance, withholding-tax, books; + manpower licence for manpower contractors.
//   any missing → "חסר"; any expired → "פג תוקף"; ≤7 days → "פג בעוד 7"; ≤30 → "פג בעוד 30"; else "תקין".
//   pay_block = true exactly when status is "פג תוקף" or "חסר".
const today = input.today || todayIL();
const mb = mutationBuilder();
const changes = [];
const counts = {};

(input.vendors || pageItems(input.data, 'vendors')).forEach((v, i) => {
  const isManpower = cvText(v, 'vendor_type') === 'קבלן כוח אדם';
  const required = ['insurance_exp', 'wht_exp', 'books_exp'].concat(isManpower ? ['manpower_exp'] : []);
  const dates = required.map((c) => cvText(v, c));
  let status;
  if (dates.some((d) => !d)) status = 'חסר';
  else {
    const minDays = Math.min(...dates.map((d) => daysBetween(today, d)));
    status = minDays < 0 ? 'פג תוקף' : minDays <= 7 ? 'פג בעוד 7' : minDays <= 30 ? 'פג בעוד 30' : 'תקין';
  }
  const block = status === 'פג תוקף' || status === 'חסר';
  counts[status] = (counts[status] || 0) + 1;
  const prevStatus = cvText(v, 'compliance');
  const prevBlock = cvText(v, 'pay_block') === 'v';
  if (prevStatus === status && prevBlock === block) return;
  const cv = { compliance: { label: status }, pay_block: block ? { checked: 'true' } : null, int_key: `M07:${v.id}:${today}` };
  mb.op(`v${i}: change_multiple_column_values(board_id: ${C.board.vendors}, item_id: ${v.id}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
  changes.push(`${v.name}: ${prevStatus || '—'} → ${status}`);
  // A11 — newly blocked vendor: tell the office manager (and the VP) the same morning.
  if (block && !prevBlock) {
    notify(mb, `nb${i}`, C.users.office, v.id, `ספק נחסם לתשלום: ${v.name} — ${status}`);
    notify(mb, `nv${i}`, C.users.vp, v.id, `ספק נחסם לתשלום: ${v.name} — ${status}`);
  }
});

// Daily summary row (non-financial scenarios log once a day, §8.2.4) — also the heartbeat M16 looks for.
const total = (input.vendors || pageItems(input.data, 'vendors')).length;
const summary = Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(' · ') || 'אין ספקים';
logRow(mb, 'log', {
  result: 'הצליח', sourceBoard: 'ספקים וקבלני משנה', intKey: `M07:${today}`,
  name: `M07 · ${today} · ${total} ספקים · ${changes.length} שינויים`, note: [summary, ...changes].join('\n'),
});
return mb.build({ changes: changes.length, total });
