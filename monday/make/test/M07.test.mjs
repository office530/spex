import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode } from '../lib.mjs';
import { assertGql } from './_gql.mjs';

const col = (id, text) => ({ id, text });
const vendor = (id, o) => ({ id, name: `ספק ${id}`, column_values: [
  col('vendor_type', o.type ?? 'קבלן משנה'), col('insurance_exp', o.ins ?? '2027-01-01'), col('wht_exp', o.wht ?? '2027-01-01'),
  col('books_exp', o.books ?? '2027-01-01'), col('manpower_exp', o.mp ?? ''), col('compliance', o.status ?? ''), col('pay_block', o.block ? 'v' : '')] });
const today = '2026-10-03';
const run = (vendors) => runCode('M07_compliance.js', { vendors, today }, 'M07', 'v1.0');
const writes = (r) => Object.values(r.vars).filter((v) => typeof v === 'string' && v.includes('"compliance"')).map((v) => JSON.parse(v));

test('statuses: ok / 30 / 7 / expired / missing; manpower licence only for manpower contractors', async () => {
  const r = await run([
    vendor('1', {}),
    vendor('2', { ins: '2026-10-25' }),
    vendor('3', { wht: '2026-10-08' }),
    vendor('4', { books: '2026-10-01' }), // acceptance test 7: expired → blocked
    vendor('5', { ins: '' }),
    vendor('6', { type: 'קבלן כוח אדם', mp: '' }),
    vendor('7', { mp: '' }), // regular subcontractor without manpower licence → fine
  ]);
  assertGql(r.query);
  const w = writes(r);
  assert.deepEqual(w.map((x) => x.compliance.label), ['תקין', 'פג בעוד 30', 'פג בעוד 7', 'פג תוקף', 'חסר', 'חסר', 'תקין']);
  assert.deepEqual(w.map((x) => Boolean(x.pay_block)), [false, false, false, true, true, true, false]);
  assert.match(r.query, /create_notification/); // A11
});

test('unchanged vendors are not rewritten; summary row always logged', async () => {
  const r = await run([vendor('1', { status: 'תקין' }), vendor('4', { books: '2026-10-01', status: 'פג תוקף', block: true })]);
  assert.equal(r.changes, 0);
  assert.doesNotMatch(r.query, /change_multiple_column_values/);
  assert.match(r.query, /log: create_item/);
});

test('expiry exactly today is still valid ("פג בעוד 7"), tomorrow-expired is not', async () => {
  const r = await run([vendor('1', { ins: today }), vendor('2', { ins: '2026-10-02' })]);
  assert.deepEqual(writes(r).map((x) => x.compliance.label), ['פג בעוד 7', 'פג תוקף']);
});
