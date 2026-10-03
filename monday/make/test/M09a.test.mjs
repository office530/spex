import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode, B } from '../lib.mjs';
import { assertGql } from './_gql.mjs';

const agg = (v) => ({ results: [{ entries: [{ value: { result: v } }] }] });

test('plan: order event → its budget line, no project rollup', async () => {
  const r = await runCode('M09a_plan.js', {
    items: [{ id: '1', bl: [{ linked_item_ids: ['555'] }], pr: [{ linked_item_ids: ['777'] }] }],
    boardId: B.orders, columnId: 'approval', prev: null,
  });
  assert.equal(r.skip, false);
  assertGql(r.query);
  assert.deepEqual(r.lines, [555]);
  assert.deepEqual(r.projects, []);
  assert.match(r.query, /l0: items\(ids: \[555\]\)/);
  assert.match(r.query, /column_id: "approval", compare_value: \[1\], operator: any_of/);
  assert.match(r.query, /column_id: "status", compare_value: \[10\], operator: not_any_of/);
});

test('plan: budget_line swapped → old and new line both recomputed', async () => {
  const r = await runCode('M09a_plan.js', {
    items: [{ id: '1', bl: [{ linked_item_ids: ['556'] }], pr: [{ linked_item_ids: [] }] }],
    boardId: B.orders, columnId: 'budget_line', prev: { linkedPulseIds: [{ linkedPulseId: 555 }] },
  });
  assert.deepEqual(r.lines, [556, 555]);
});

test('plan: change event → line + project rollup', async () => {
  const r = await runCode('M09a_plan.js', {
    items: [{ id: '1', bl: [{ linked_item_ids: ['555'] }], pr: [{ linked_item_ids: ['777'] }] }],
    boardId: B.changes, columnId: 'status', prev: null,
  });
  assert.deepEqual(r.projects, [777]);
  assertGql(r.query);
  assert.match(r.query, /pa0: aggregate/);
});

test('plan: nothing linked → skip', async () => {
  const r = await runCode('M09a_plan.js', { items: [{ id: '1', bl: [{ linked_item_ids: [] }], pr: [{ linked_item_ids: [] }] }], boardId: B.orders, columnId: 'amount' });
  assert.equal(r.skip, true);
});

const line = (o) => [{ id: '555', name: 'P26-014-22-SC', column_values: [
  { id: 'orig_budget', text: String(o.orig) }, { id: 'commitments', text: String(o.commit ?? '') },
  { id: 'approved_changes', text: String(o.appr ?? '') }, { id: 'budget_status', text: o.status ?? '' }] }];

test('compute: approved order of 5,000 on a 10,000 line → write commitments, status תקין, log row', async () => {
  const r = await runCode('M09a_compute.js', { data: { l0: line({ orig: 10000 }), c0: agg(5000), k0: agg(0), x0: agg(null) }, lines: [555], projects: [], changedAt: 1 }, 'M09a', 'v1.0');
  assert.equal(r.skip, false);
  assertGql(r.query);
  const cv = JSON.parse(r.vars.v0);
  assert.deepEqual(cv, { commitments: '5000', approved_changes: '0', budget_status: { label: 'תקין' }, int_status: { label: 'תקין' }, int_key: 'M09a:555:1' });
  assert.match(r.query, /u0: change_multiple_column_values\(board_id: \d+, item_id: 555/);
  assert.match(r.query, /log0: create_item/);
  assert.doesNotMatch(r.query, /create_notification/);
});

test('compute: re-run with identical values → nothing to do (idempotent, no log noise)', async () => {
  const r = await runCode('M09a_compute.js', { data: { l0: line({ orig: 10000, commit: 5000, appr: 0, status: 'תקין' }), c0: agg(5000), k0: agg(0), x0: agg(0) }, lines: [555], projects: [] }, 'M09a', 'v1.0');
  assert.equal(r.skip, true);
  assert.equal(r.query, '');
});

test('compute: cancelling an order shrinks commitments (acceptance test 4)', async () => {
  const r = await runCode('M09a_compute.js', { data: { l0: line({ orig: 10000, commit: 8000, appr: 0, status: 'תקין' }), c0: agg(5000), k0: agg(0), x0: agg(0) }, lines: [555], projects: [] }, 'M09a', 'v1.0');
  assert.equal(JSON.parse(r.vars.v0).commitments, '5000');
});

test('compute: over budget → חריגה + notification once', async () => {
  const r = await runCode('M09a_compute.js', { data: { l0: line({ orig: 10000, status: 'תקין' }), c0: agg(9000), k0: agg(2000), x0: agg(500) }, lines: [555], projects: [] }, 'M09a', 'v1.0');
  const cv = JSON.parse(r.vars.v0);
  assert.equal(cv.commitments, '11000');
  assert.equal(cv.approved_changes, '500');
  assert.equal(cv.budget_status.label, 'חריגה');
  assert.match(r.query, /create_notification/);
  const again = await runCode('M09a_compute.js', { data: { l0: line({ orig: 10000, commit: 11000, appr: 500, status: 'חריגה' }), c0: agg(9000), k0: agg(2000), x0: agg(500) }, lines: [555], projects: [] }, 'M09a', 'v1.0');
  assert.doesNotMatch(again.query, /create_notification/);
});

test('compute: 92% utilised → מעל 90%', async () => {
  const r = await runCode('M09a_compute.js', { data: { l0: line({ orig: 10000 }), c0: agg(9200), k0: agg(0), x0: agg(0) }, lines: [555], projects: [] }, 'M09a', 'v1.0');
  assert.equal(JSON.parse(r.vars.v0).budget_status.label, 'מעל 90%');
});

test('compute: project rollup writes approved / unapproved change totals', async () => {
  const p = [{ id: '777', name: 'מיקרוסופט TLV21', column_values: [{ id: 'approved_changes', text: '' }, { id: 'unapproved_changes', text: '' }] }];
  const r = await runCode('M09a_compute.js', { data: { p0: p, pa0: agg(42000), pu0: agg(3000) }, lines: [], projects: [777] }, 'M09a', 'v1.0');
  assert.deepEqual(JSON.parse(r.vars.v0), { approved_changes: '42000', unapproved_changes: '3000' });
});
