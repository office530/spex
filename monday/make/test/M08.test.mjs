import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode, USERS } from '../lib.mjs';
import { assertGql } from './_gql.mjs';

const col = (id, text) => ({ id, text });
const bill = (id, o) => ({ id, name: `BL-${id}`, column_values: [col('approved_amt', String(o.amt ?? 100000)), col('paid', String(o.paid ?? 0)), col('due', o.due ?? ''), col('collection', o.stage ?? '')] });
const run = (bills) => runCode('M08_collection.js', { bills, today: '2026-10-03' }, 'M08', 'v1.0');
const stages = (r) => Object.values(r.vars).filter((v) => typeof v === 'string' && v.includes('"collection"')).map((v) => JSON.parse(v).collection.label);

test('ladder by days past due; paid bills and bills without due date are skipped', async () => {
  const r = await run([
    bill('1', { due: '2026-10-10' }), bill('2', { due: '2026-09-26' }), bill('3', { due: '2026-09-19' }),
    bill('4', { due: '2026-09-12' }), bill('5', { due: '2026-09-03' }), bill('6', { due: '2026-08-19' }),
    bill('7', { due: '2026-08-01', paid: 118000 }), bill('8', {}),
  ]);
  assertGql(r.query);
  assert.deepEqual(stages(r), ['בזמן', '7 תזכורת', '14 שיחת PM', '21 שיחת סמנכ״ל', '30 מכתב מנכ״ל', '45 עו״ד']);
  assert.equal(r.openTotal, 6 * 118000);
  assert.match(r.query, /create_notification/);
});

test('A10: escalation steps open a task for the right person (PM from the project, else VP; CEO at 30/45)', async () => {
  const b = (id, due, project) => ({ id, name: `BL-${id}`, column_values: [col('approved_amt', '100000'), col('paid', '0'), col('due', due), col('collection', ''), { id: 'project', text: '', linked_item_ids: project ? [String(project)] : [] }] });
  const projects = [{ items_page: { cursor: null, items: [{ id: '100', name: 'P', column_values: [{ id: 'pm', text: 'x', value: JSON.stringify({ personsAndTeams: [{ id: 501, kind: 'person' }] }) }] }] } }];
  const r = await runCode('M08_collection.js', { data: { bills: [{ items_page: { cursor: null, items: [b('1', '2026-09-26', 100), b('2', '2026-09-19', 100), b('3', '2026-09-19'), b('4', '2026-08-19')] } }], projects }, today: '2026-10-03' }, 'M08', 'v1.0');
  assertGql(r.query);
  const tasks = Object.values(r.vars).filter((v) => typeof v === 'string' && v.includes('"task_type"')).map((v) => JSON.parse(v));
  assert.deepEqual(tasks.map((t) => t.owner.personsAndTeams[0].id), [501, USERS.vp, USERS.ceo]); // 7-day stage opens no task
  assert.deepEqual(tasks[0].project, { item_ids: [100] });
  assert.equal(tasks[2].priority.label, 'דחוף');
});

test('stage unchanged → no write', async () => {
  const r = await run([bill('2', { due: '2026-09-26', stage: '7 תזכורת' })]);
  assert.equal(r.moved, 0);
});
