// M09a step 2 — recompute each line from scratch (replace, never add → re-runs can't double count).
// input: data (fetch result), lines, projects, changedAt
const d = input.data || {};
const mb = mutationBuilder();
const stamp = input.changedAt || Date.now();

(input.lines || []).forEach((id, i) => {
  const line = d[`l${i}`]?.[0];
  if (!line) return; // line was deleted
  const orig = num(cvText(line, 'orig_budget'));
  const commitments = round2(aggVal(d, `c${i}`) + aggVal(d, `k${i}`));
  const approved = round2(aggVal(d, `x${i}`));
  const revised = orig + approved;
  const remaining = revised - commitments;
  const status = remaining < 0 ? 'חריגה' : commitments > 0 && commitments > revised * 0.9 ? 'מעל 90%' : 'תקין';
  const prevStatus = cvText(line, 'budget_status');
  const same = num(cvText(line, 'commitments')) === commitments && num(cvText(line, 'approved_changes')) === approved && prevStatus === status;
  const key = `M09a:${id}:${stamp}`;
  if (!same) {
    const cv = { commitments: String(commitments), approved_changes: String(approved), budget_status: { label: status }, int_status: { label: 'תקין' }, int_key: key };
    mb.op(`u${i}: change_multiple_column_values(board_id: ${C.board.budget}, item_id: ${id}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
  }
  if (status === 'חריגה' && prevStatus !== 'חריגה') {
    // A03 — line went over budget.
    notify(mb, `n${i}`, C.users.vp, id, `חריגת תקציב: ${line.name} — התחייבויות ${commitments.toLocaleString('he-IL')} ש״ח מול תקציב מעודכן ${revised.toLocaleString('he-IL')} ש״ח`);
  }
  // Every financial write is logged (§8.2.4). No-change re-runs (e.g. echoes of M03's own status writes) are not.
  if (!same) {
    logRow(mb, `log${i}`, {
      sourceBoard: 'שורות תקציב', sourceItem: id, intKey: key,
      name: `M09a · ${line.name} · התחייבויות ${commitments} · שינויים ${approved} · ${status}`,
    });
  }
});

(input.projects || []).forEach((id, j) => {
  const p = d[`p${j}`]?.[0];
  if (!p) return;
  const approved = round2(aggVal(d, `pa${j}`));
  const unapproved = round2(aggVal(d, `pu${j}`));
  if (num(cvText(p, 'approved_changes')) === approved && num(cvText(p, 'unapproved_changes')) === unapproved) return;
  const cv = { approved_changes: String(approved), unapproved_changes: String(unapproved) };
  mb.op(`pr${j}: change_multiple_column_values(board_id: ${C.board.projects}, item_id: ${id}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
  logRow(mb, `plog${j}`, { sourceBoard: 'תיק פרויקטים', sourceItem: id, intKey: `M09a:P${id}:${stamp}`, name: `M09a · ${p.name} · שינויים מאושרים ${approved} · ללא אישור ${unapproved}` });
});

return mb.build();
