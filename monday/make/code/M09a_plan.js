// M09a step 1 — which budget lines / projects does this event touch, and what to read for them.
// input: items (fetch of the changed order/change), boardId, columnId, prev (event.previousValue), changedAt
const item = (input.items || [])[0];
const linked = (alias) => (item?.[alias]?.[0]?.linked_item_ids ?? []).map(Number);

let lines = linked('bl');
if (input.columnId === 'budget_line') {
  // The line was swapped: the old line must shrink as well.
  lines = lines.concat((input.prev?.linkedPulseIds ?? []).map((x) => Number(x.linkedPulseId)));
}
lines = [...new Set(lines)].filter(Boolean);
const projects = String(input.boardId) === String(C.board.changes) ? [...new Set(linked('pr'))].filter(Boolean) : [];

if (!lines.length && !projects.length) return { skip: true, query: '', lines, projects };

const parts = [];
lines.forEach((id, i) => {
  parts.push(`l${i}: items(ids: [${id}]) { id name column_values(ids: ["orig_budget","commitments","approved_changes","budget_status"]) { id text } }`);
  // Commitments = approved, non-cancelled orders on the line + approved subcontractor claims.
  parts.push(aggSum(`c${i}`, C.board.orders,
    [rule('budget_line', [id]), rule('approval', [C.lbl.orderApproved]), rule('status', [C.lbl.orderCancelled], 'not_any_of')], 'amount'));
  parts.push(aggSum(`k${i}`, C.board.changes,
    [rule('budget_line', [id]), rule('change_type', [C.lbl.subClaim]), rule('status', C.lbl.changeApproved)], 'amount'));
  // Approved changes on the cost budget = cost of approved client change orders.
  parts.push(aggSum(`x${i}`, C.board.changes,
    [rule('budget_line', [id]), rule('change_type', [C.lbl.clientChange]), rule('status', C.lbl.changeApproved)], 'cost'));
});
projects.forEach((id, j) => {
  parts.push(`p${j}: items(ids: [${id}]) { id name column_values(ids: ["approved_changes","unapproved_changes"]) { id text } }`);
  parts.push(aggSum(`pa${j}`, C.board.changes,
    [rule('project', [id]), rule('change_type', [C.lbl.clientChange]), rule('status', C.lbl.changeApproved)], 'amount'));
  parts.push(aggSum(`pu${j}`, C.board.changes, [rule('project', [id]), rule('status', [C.lbl.changeUnapproved])], 'amount'));
});
return { skip: false, query: `query { ${parts.join(' ')} }`, lines, projects };
