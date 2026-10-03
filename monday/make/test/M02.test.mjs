import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode, B, manifest } from '../lib.mjs';
import { assertGql } from './_gql.mjs';

const REF = manifest.boards.projects.reflections.lead;
const col = (id, text) => ({ id, text, value: null });
const rel = (id, ids) => ({ id, text: '', value: null, linked_item_ids: ids.map(String) });
const page = (items) => [{ items_page: { cursor: null, items } }];
const lead = (o = {}) => [{ id: '500', name: 'מיקרוסופט TLV21', column_values: [
  col('rec_id', 'L26-0042'), col('price', o.price ?? '1,250,000'), col('expected_value', ''),
  rel('company', o.client === false ? [] : [900]), rel('project', o.project ? [o.project] : []),
] }];
const proj = (id, code, intKey = '') => ({ id, name: 'x', column_values: [col('project_code', code), col('int_key', intKey), rel(REF, [])] });
const jsonVars = (r) => Object.values(r.vars).filter((v) => typeof v === 'string' && v.startsWith('{')).map((v) => JSON.parse(v));

test('M02: win → next code this year, project linked to lead + client, setup task, CEO notified, logged', async () => {
  const data = { lead: lead(), projects: page([proj('1', 'P26-002'), proj('2', 'P25-031'), proj('3', 'P26-009')]) };
  const r = await runCode('M02_win.js', { data, today: '2026-10-04' }, 'M02', 'v1.0');
  assertGql(r.query);
  assert.equal(r.projectCode, 'P26-010');
  const [project, leadCv, task] = jsonVars(r);
  assert.deepEqual(project.client, { item_ids: [900] });
  assert.deepEqual(project[REF], { item_ids: [500] });
  assert.equal(project.contract_value, '1250000');
  assert.equal(project.int_key, 'M02:L26-0042');
  assert.equal(leadCv.int_key, 'M02:L26-0042');
  assert.equal(task.due.date, '2026-10-06');
  assert.match(r.query, new RegExp(`create_item\\(board_id: ${B.projects}`));
  assert.equal((r.query.match(/create_notification/g) || []).length, 1); // VP falls back to CEO → one notification
});

test('M02: first project of a new year starts at 001; missing client/price are reported, not invented', async () => {
  const data = { lead: lead({ client: false, price: '' }), projects: page([proj('1', 'P26-044')]) };
  const r = await runCode('M02_win.js', { data, today: '2027-01-03' }, 'M02', 'v1.0');
  assert.equal(r.projectCode, 'P27-001');
  const [project] = jsonVars(r);
  assert.equal(project.client, undefined);
  assert.equal(project.contract_value, undefined);
  assert.deepEqual(r.gaps, ['אין לקוח מקושר לליד', 'אין מחיר בהצעה']);
});

test('M02: re-run is a no-op — lead already linked, or a project already carries the key', async () => {
  const linked = await runCode('M02_win.js', { data: { lead: lead({ project: 77 }), projects: page([]) }, today: '2026-10-04' }, 'M02', 'v1.0');
  assert.equal(linked.existing, 77);
  assert.equal((linked.query.match(/create_item/g) || []).length, 1); // the log row only
  const keyed = await runCode('M02_win.js', { data: { lead: lead(), projects: page([proj('88', 'P26-001', 'M02:L26-0042')]) }, today: '2026-10-04' }, 'M02', 'v1.0');
  assert.equal(keyed.existing, 88);
});
