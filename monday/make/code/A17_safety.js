// A17 / M19b — weekly safety tour missing (Thursday 12:00). Active project with no "סיור שבועי" record dated this
// week (Sunday→today) → a task for the site manager in "משימות ותפעול שוטף" (group השבוע) + notification.
// Idempotent per project+week via int_key, so a manual re-run never duplicates tasks.
// input: data = { projects, safety, tasks }, today (optional)
const d = input.data || {};
const today = input.today || todayIL();
const mb = mutationBuilder();
const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
const weekStart = new Date(Date.parse(`${today}T12:00:00Z`) - dow * 86400000).toISOString().slice(0, 10);
const ACTIVE = ['התנעה', 'ביצוע', 'מסירה'];
const projects = pageItems(d, 'projects').filter((p) => ACTIVE.includes(cvText(p, 'phase')) && !isDemo(p));
const toured = new Set(
  pageItems(d, 'safety')
    .filter((s) => cvText(s, 'rec_type') === 'סיור שבועי' && cvText(s, 'date') >= weekStart && cvText(s, 'date') <= today)
    .flatMap((s) => relIds(s, 'project')),
);
const existingKeys = new Set(pageItems(d, 'tasks').map((t) => cvText(t, 'int_key')));
const created = [];
projects.forEach((p, i) => {
  if (toured.has(Number(p.id))) return;
  const key = `A17:${p.id}:${weekStart}`;
  if (existingKeys.has(key)) return;
  const owner = personIds(p, 'site_mgr')[0] || personIds(p, 'pm')[0] || C.users.vp;
  const cv = {
    task_type: { label: 'חד-פעמית' }, domain: { labels: ['פרויקט'] }, status: { label: 'חדש' }, priority: { label: 'דחוף' },
    owner: { personsAndTeams: [{ id: owner, kind: 'person' }] }, due: { date: today },
    project: { item_ids: [Number(p.id)] }, int_key: key,
  };
  mb.op(`t${i}: create_item(board_id: ${C.board.tasks}, group_id: "${C.group.tasksWeek}", item_name: ${mb.v('String!', `סיור בטיחות שבועי חסר — ${p.name}`)}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}) { id }`);
  notify(mb, `n${i}`, owner, p.id, `לא נרשם סיור בטיחות שבועי השבוע — ${p.name}. נפתחה משימה.`);
  created.push(p.name);
});
logRow(mb, 'log', {
  result: 'הצליח', sourceBoard: 'בטיחות', intKey: `A17:${weekStart}`,
  name: `A17 · שבוע ${weekStart} · ${projects.length} פרויקטים פעילים · ${created.length} ללא סיור`, note: created.join('\n'),
});
return mb.build({ created: created.length, weekStart });
