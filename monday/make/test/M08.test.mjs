import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode } from '../lib.mjs';
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

test('stage unchanged → no write', async () => {
  const r = await run([bill('2', { due: '2026-09-26', stage: '7 תזכורת' })]);
  assert.equal(r.moved, 0);
});
