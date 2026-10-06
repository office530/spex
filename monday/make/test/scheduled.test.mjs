import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode } from '../lib.mjs';
import { assertGql } from './_gql.mjs';

const col = (id, text, extra = {}) => ({ id, text, ...extra });
const rel = (id, ids) => ({ id, text: '', linked_item_ids: ids.map(String) });
const ppl = (id, uid) => ({ id, text: 'x', value: JSON.stringify({ personsAndTeams: [{ id: uid, kind: 'person' }] }) });
const page = (items, cursor = null) => [{ items_page: { cursor, items } }];
const jsonVars = (r) => Object.values(r.vars).filter((v) => typeof v === 'string' && v.startsWith('{')).map((v) => JSON.parse(v));

test('M09b: matching line → no gap; drifted line → gap reported, nothing auto-fixed; project counters refreshed', async () => {
  const data = {
    lines: page([
      { id: '1', name: 'L1', column_values: [col('commitments', '5000'), col('approved_changes', '0')] },
      { id: '2', name: 'L2', column_values: [col('commitments', '999'), col('approved_changes', '0')] },
    ]),
    orders: page([
      { id: '10', column_values: [rel('budget_line', [1]), col('amount', '5000'), col('approval', 'מאושר'), col('status', 'מאושר')] },
      { id: '11', column_values: [rel('budget_line', [2]), col('amount', '3000'), col('approval', 'מאושר'), col('status', 'נשלח לספק')] },
      { id: '12', column_values: [rel('budget_line', [2]), col('amount', '7000'), col('approval', 'מאושר'), col('status', 'בוטל')] },
    ]),
    changes: page([
      { id: '20', column_values: [rel('budget_line', [2]), rel('project', [100]), col('change_type', 'שינוי ללקוח'), col('status', 'אושר'), col('amount', '9000'), col('cost', '4000')] },
      { id: '21', column_values: [rel('budget_line', []), rel('project', [100]), col('change_type', 'שינוי ללקוח'), col('status', 'בוצע ללא אישור'), col('amount', '1500'), col('cost', '')] },
    ]),
    defects: page([
      { id: '30', column_values: [rel('project', [100]), col('status', 'פתוח')] },
      { id: '31', column_values: [rel('project', [100]), col('status', 'נסגר')] },
    ]),
    projects: page([{ id: '100', name: 'P', column_values: [col('open_defects', ''), col('unapproved_changes', ''), col('approved_changes', '')] }]),
  };
  const r = await runCode('M09b_reconcile.js', { data, today: '2026-10-04' }, 'M09b', 'v1.0');
  assertGql(r.query);
  assert.equal(r.gaps, 1);
  assert.doesNotMatch(r.query, new RegExp('board_id: \\d+, item_id: 2,')); // no auto-fix of the line
  assert.deepEqual(jsonVars(r)[0], { open_defects: '1', unapproved_changes: '1500', approved_changes: '9000' });
});

test('M11b: active project without a journal today → +1 missing day and a notification', async () => {
  const data = {
    projects: page([
      { id: '1', name: 'עם יומן', column_values: [col('phase', 'ביצוע'), col('missing_journals', '0')] },
      { id: '2', name: 'בלי יומן', column_values: [col('phase', 'ביצוע'), col('missing_journals', '2'), ppl('site_mgr', 555)] },
      { id: '3', name: 'סגור', column_values: [col('phase', 'סגור')] },
      { id: '4', name: 'דמו', column_values: [col('phase', 'ביצוע'), col('int_key', 'DEMO:projects:1')] },
    ]),
    journals: page([{ id: '9', column_values: [col('date', '2026-10-04'), rel('project', [1])] }, { id: '8', column_values: [col('date', '2026-10-03'), rel('project', [2])] }]),
  };
  const r = await runCode('M11b_journals.js', { data, today: '2026-10-04' }, 'M11b', 'v1.0');
  assertGql(r.query);
  assert.equal(r.missing, 1);
  assert.equal(jsonVars(r)[0].missing_journals, '3');
  assert.match(r.query, /create_notification\(user_id: 555/);
  assert.doesNotMatch(r.query, /דמו/); // demo rows are skipped
});

test('A17: no weekly tour since Sunday → one task per project per week (idempotent)', async () => {
  const data = {
    projects: page([
      { id: '1', name: 'A', column_values: [col('phase', 'ביצוע'), ppl('site_mgr', 555)] },
      { id: '2', name: 'B', column_values: [col('phase', 'ביצוע')] },
      { id: '3', name: 'דמו', column_values: [col('phase', 'ביצוע'), col('int_key', 'DEMO:projects:1')] },
    ]),
    safety: page([{ id: '7', column_values: [col('rec_type', 'סיור שבועי'), col('date', '2026-10-05'), rel('project', [2])] }]),
    tasks: page([]),
  };
  const r = await runCode('A17_safety.js', { data, today: '2026-10-08' }, 'A17', 'v1.0'); // Thursday
  assertGql(r.query);
  assert.equal(r.weekStart, '2026-10-04');
  assert.equal(r.created, 1); // the demo project is skipped
  const again = await runCode('A17_safety.js', { data: { ...data, tasks: page([{ id: 't', column_values: [col('int_key', 'A17:1:2026-10-04')] }]) }, today: '2026-10-08' }, 'A17', 'v1.0');
  assert.equal(again.created, 0);
});

test('M16: all daily rows present → ok; missing M07 + open failure → alert', async () => {
  const row = (code, when, result = 'הצליח', handled = '') => ({ id: code + when, name: code, column_values: [col('scenario', code), col('run_time', when), col('result', result), col('handled', handled)] });
  const good = page([row('M09b', '2026-10-06 02:00'), row('A12', '2026-10-06 05:30'), row('M07', '2026-10-06 06:00'), row('M08', '2026-10-06 07:00'), row('M11b', '2026-10-05 17:00')]);
  const ok = await runCode('M16_heartbeat.js', { data: { log: good }, today: '2026-10-06' }, 'M16', 'v1.0'); // Tuesday
  assert.equal(ok.ok, true);
  const bad = page([row('M09b', '2026-10-06 02:00'), row('A12', '2026-10-06 05:30'), row('M08', '2026-10-06 07:00'), row('M11b', '2026-10-05 17:00'), row('M03', '2026-10-06 07:30', 'נכשל')]);
  const r = await runCode('M16_heartbeat.js', { data: { log: bad }, today: '2026-10-06' }, 'M16', 'v1.0');
  assertGql(r.query);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['M07 (2026-10-06)']);
  assert.equal(r.openFailures, 1);
  const own = await runCode('M16_heartbeat.js', { data: { log: page([...good[0].items_page.items, row('M16', '2026-10-05 08:00', 'הוסלם')]) }, today: '2026-10-06' }, 'M16', 'v1.0');
  assert.equal(own.ok, true); // yesterday's own alert row does not re-trigger
});
