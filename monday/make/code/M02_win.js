// M02 — win → project (§5.4, §5.5, catalogue §8). Lead stage "זכייה" (or straight to "חוזה נחתם") opens the project:
// next free P{yy}-### code, an item in "תיק פרויקטים" (group הקמה) linked to the lead and the client, contract value
// from the quote price, and an "open project" task for what still needs a person — budget lines from the estimate
// sheet, the Drive folder tree, the Morning client (those integrations are not connected yet).
// Idempotent: a lead that already has a project, or a project carrying this lead's key, is only logged as skipped.
// input: data = { lead, projects }, today (optional)
const d = input.data || {};
const today = input.today || todayIL();
const mb = mutationBuilder();
const lead = (d.lead || [])[0];
if (!lead) return mb.build({ reason: 'lead not found' });

// monday's API does not return auto_number values, so the key uses the lead's item id (stable and unique) as fallback.
const key = `M02:${cvText(lead, 'rec_id') || lead.id}`;
const projects = pageItems(d, 'projects');
const existing = relIds(lead, 'project')[0] ||
  Number(projects.find((p) => cvText(p, 'int_key') === key || relIds(p, C.col.projectLead).includes(Number(lead.id)))?.id || 0);
if (existing) {
  logRow(mb, 'log', { result: 'דולג', sourceBoard: 'לידים והזדמנויות', sourceItem: lead.id, intKey: key, name: `M02 · ${lead.name} · כבר קיים פרויקט ${existing}` });
  return mb.build({ existing });
}

// Code counter: highest P{yy}-NNN on the board + 1 (the board itself is the counter — no sheet needed).
const prefix = `P${today.slice(2, 4)}-`;
const last = projects.map((p) => cvText(p, 'project_code')).filter((c) => c.startsWith(prefix))
  .reduce((max, c) => Math.max(max, parseInt(c.slice(prefix.length), 10) || 0), 0);
const projectCode = `${prefix}${String(last + 1).padStart(3, '0')}`;
const client = relIds(lead, 'company')[0];
const value = num(cvText(lead, 'price')) || num(cvText(lead, 'expected_value'));

const cv = { project_code: projectCode, phase: { label: 'הקמה' }, int_key: key, [C.col.projectLead]: { item_ids: [Number(lead.id)] } };
if (client) cv.client = { item_ids: [client] };
if (value) cv.contract_value = String(value);
mb.op(`p: create_item(board_id: ${C.board.projects}, group_id: "${C.group.projectsSetup}", item_name: ${mb.v('String!', lead.name)}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
mb.op(`l: change_multiple_column_values(board_id: ${C.board.leads}, item_id: ${lead.id}, column_values: ${mb.v('JSON!', JSON.stringify({ int_key: key, int_status: { label: 'תקין' } }))}) { id }`);

const gaps = [!client && 'אין לקוח מקושר לליד', !value && 'אין מחיר בהצעה'].filter(Boolean);
const due = new Date(Date.parse(`${today}T12:00:00Z`) + 2 * 86400000).toISOString().slice(0, 10);
const task = {
  task_type: { label: 'חד-פעמית' }, domain: { labels: ['פרויקט'] }, status: { label: 'חדש' }, priority: { label: 'גבוה' },
  owner: { personsAndTeams: [{ id: C.users.vp, kind: 'person' }] }, due: { date: due }, int_key: `${key}:setup`,
};
mb.op(`t: create_item(board_id: ${C.board.tasks}, group_id: "${C.group.tasksWeek}", item_name: ${mb.v('String!', `פתיחת פרויקט ${projectCode} — שורות תקציב מהאומדן, עץ תיקיות, לקוח ב-Morning`)}, column_values: ${mb.v('JSON!', JSON.stringify(task))}) { id }`);

const text = `זכייה: נפתח פרויקט ${projectCode} — ${lead.name}${value ? ` (${value.toLocaleString('he-IL')} ש״ח)` : ''}${gaps.length ? ` · חסר: ${gaps.join(', ')}` : ''}`;
[...new Set([C.users.ceo, C.users.vp])].forEach((u, i) => notify(mb, `n${i}`, u, lead.id, text));
logRow(mb, 'log', {
  sourceBoard: 'לידים והזדמנויות', sourceItem: lead.id, intKey: key,
  name: `M02 · ${lead.name} · נפתח ${projectCode}`, note: gaps.join('\n'),
});
return mb.build({ projectCode, gaps });
