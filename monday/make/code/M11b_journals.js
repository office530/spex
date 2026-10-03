// M11b — missing daily journal (17:00, Sun–Thu). An active project without a journal dated today:
// "ימי יומן חסרים" += 1 and the site manager (or PM) is notified (§5.7 — a "missing" check can't be a built-in automation).
// input: data = { projects, journals } , today (optional)
const d = input.data || {};
const today = input.today || todayIL();
const mb = mutationBuilder();
const ACTIVE = ['התנעה', 'ביצוע', 'מסירה'];
const projects = pageItems(d, 'projects').filter((p) => ACTIVE.includes(cvText(p, 'phase')));
const withJournal = new Set(
  pageItems(d, 'journals').filter((j) => cvText(j, 'date') === today).flatMap((j) => relIds(j, 'project')),
);
const missing = [];
projects.forEach((p, i) => {
  if (withJournal.has(Number(p.id))) return;
  missing.push(p.name);
  const count = num(cvText(p, 'missing_journals')) + 1;
  mb.op(`p${i}: change_multiple_column_values(board_id: ${C.board.projects}, item_id: ${p.id}, column_values: ${mb.v('JSON!', JSON.stringify({ missing_journals: String(count) }))}) { id }`);
  const to = personIds(p, 'site_mgr')[0] || personIds(p, 'pm')[0] || C.users.vp;
  notify(mb, `n${i}`, to, p.id, `חסר יומן עבודה להיום (${today}) — ${p.name}. סה״כ ימים חסרים: ${count}`);
});
logRow(mb, 'log', {
  result: 'הצליח', sourceBoard: 'יומני עבודה', intKey: `M11b:${today}`,
  name: `M11b · ${today} · ${projects.length} פרויקטים פעילים · ${missing.length} ללא יומן`, note: missing.join('\n'),
});
return mb.build({ missing: missing.length, active: projects.length });
