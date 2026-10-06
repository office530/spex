// M09b — nightly reconciliation (02:00). Recomputes every budget line from orders + changes and only REPORTS gaps
// (no auto-fix, §8.3). Also refreshes the live project counters nobody else writes: open defects,
// unapproved-change value, approved client-change value.
// input: data = { lines, orders, changes, defects, projects } (aliased items_page fetches), today (optional)
const d = input.data || {};
const today = input.today || todayIL();
const mb = mutationBuilder();
const lines = pageItems(d, 'lines');
const orders = pageItems(d, 'orders');
const changes = pageItems(d, 'changes');
const defects = pageItems(d, 'defects');
const projects = pageItems(d, 'projects');

const APPROVED_CHANGE = ['אושר', 'חויב'];
const expected = new Map(lines.map((l) => [Number(l.id), { commit: 0, appr: 0 }]));
const bump = (lineId, key, v) => { const e = expected.get(lineId); if (e) e[key] += v; };

orders.forEach((o) => {
  if (cvText(o, 'approval') !== 'מאושר' || cvText(o, 'status') === 'בוטל') return;
  relIds(o, 'budget_line').forEach((l) => bump(l, 'commit', num(cvText(o, 'amount'))));
});
changes.forEach((c) => {
  if (!APPROVED_CHANGE.includes(cvText(c, 'status'))) return;
  const type = cvText(c, 'change_type');
  relIds(c, 'budget_line').forEach((l) => {
    if (type === 'דרישת קבלן משנה') bump(l, 'commit', num(cvText(c, 'amount')));
    if (type === 'שינוי ללקוח') bump(l, 'appr', num(cvText(c, 'cost')));
  });
});

const gaps = [];
lines.forEach((l) => {
  const e = expected.get(Number(l.id));
  const haveC = num(cvText(l, 'commitments'));
  const haveA = num(cvText(l, 'approved_changes'));
  if (Math.abs(haveC - round2(e.commit)) > 0.5 || Math.abs(haveA - round2(e.appr)) > 0.5) {
    gaps.push(`${l.name}: התחייבויות ${haveC} ↔ ${round2(e.commit)}, שינויים ${haveA} ↔ ${round2(e.appr)}`);
  }
});

// Project counters (live fields on תיק פרויקטים, §5.5).
const OPEN_DEFECT = (s) => !['תוקן', 'נבדק', 'נסגר'].includes(s);
let projectWrites = 0;
projects.forEach((p, i) => {
  const pid = Number(p.id);
  const openDefects = defects.filter((x) => relIds(x, 'project').includes(pid) && OPEN_DEFECT(cvText(x, 'status'))).length;
  const mine = changes.filter((c) => relIds(c, 'project').includes(pid));
  const unapproved = round2(mine.filter((c) => cvText(c, 'status') === 'בוצע ללא אישור').reduce((s, c) => s + num(cvText(c, 'amount')), 0));
  const approved = round2(mine.filter((c) => cvText(c, 'change_type') === 'שינוי ללקוח' && APPROVED_CHANGE.includes(cvText(c, 'status'))).reduce((s, c) => s + num(cvText(c, 'amount')), 0));
  if (num(cvText(p, 'open_defects')) === openDefects && num(cvText(p, 'unapproved_changes')) === unapproved && num(cvText(p, 'approved_changes')) === approved) return;
  projectWrites++;
  const cv = { open_defects: String(openDefects), unapproved_changes: String(unapproved), approved_changes: String(approved) };
  mb.op(`p${i}: change_multiple_column_values(board_id: ${C.board.projects}, item_id: ${pid}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
});

const partial = truncated(d, 'lines', 'orders', 'changes', 'defects', 'projects');
if (gaps.length) {
  notify(mb, 'n', C.users.vp, lines[0]?.id, `התאמה לילית: ${gaps.length} פערים בשורות תקציב — ראו יומן אינטגרציות`);
}
logRow(mb, 'log', {
  result: gaps.length ? 'הוסלם' : 'הצליח', sourceBoard: 'שורות תקציב', intKey: `M09b:${today}`,
  name: `M09b · ${today} · ${lines.length} שורות · ${gaps.length} פערים · ${projectWrites} פרויקטים עודכנו${partial.length ? ' · נתונים חלקיים' : ''}`,
  note: [...gaps, ...(partial.length ? [`עמוד ראשון בלבד (500): ${partial.join(', ')} — להרחיב את M09b לעימוד`] : [])].join('\n'),
});
return mb.build({ gaps: gaps.length, projectWrites });
