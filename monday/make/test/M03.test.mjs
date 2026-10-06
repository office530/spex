import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode, B, USERS } from '../lib.mjs';
import { assertGql } from './_gql.mjs';

const PM = 777001;
const OTHER = 999999;
const col = (id, text, value) => ({ id, text, value: value === undefined ? null : JSON.stringify(value) });
const vendor = (opts = {}) => ({ id: '5001', name: 'ספק בדיקה', column_values: [col('compliance', opts.compliance ?? 'תקין'), col('pay_block', opts.block ? 'v' : '', opts.block ? { checked: 'true' } : null)] });
const project = { id: '6001', name: 'פרויקט', column_values: [col('pm', 'מנהל', { personsAndTeams: [{ id: PM, kind: 'person' }] })] };
const order = (o = {}) => ({
  id: '4001', name: 'הזמנת גבס', column_values: [
    col('amount', String(o.amount ?? 25000)), col('in_budget', o.inBudget ?? 'כן'),
    col('framework_price', o.framework ? 'v' : '', o.framework ? { checked: 'true' } : null),
    col('three_quotes', (o.quotes ?? true) ? 'v' : '', (o.quotes ?? true) ? { checked: 'true' } : null),
    { id: 'vendor', text: '', value: null, linked_items: o.noVendor ? [] : [vendor(o.vendor)] },
    { id: 'budget_line', text: '', value: null, linked_items: o.noLine ? [] : [{ id: '7001', name: 'שורה', column_values: [] }] },
    { id: 'project', text: '', value: null, linked_items: [project] },
    col('requester', 'מבקש', { personsAndTeams: [{ id: 888, kind: 'person' }] }),
    col('int_key', o.key ?? ''),
  ],
});
const run = (item, ev) => runCode('M03_decide.js', { item, boardId: ev.board ?? B.orders, columnId: ev.col, label: ev.label, prevLabel: ev.prev ?? '', userId: ev.user ?? USERS.ceo, userName: 'בודק' }, 'M03', 'v1.0');
const varsJson = (r) => Object.values(r.vars).filter((v) => typeof v === 'string' && v.startsWith('{')).map((v) => JSON.parse(v));

test('order 25,000 in budget → PM tier, notifies project PM, writes waiting labels + key', async () => {
  const r = await run(order(), { col: 'status', label: 'הוגש לאישור' });
  assert.equal(r.decision, 'route-pm');
  assertGql(r.query);
  const cols = varsJson(r)[0];
  assert.equal(cols.approval.label, 'ממתין מנהל פרויקט');
  assert.equal(cols.status.label, 'ממתין מנהל פרויקט');
  assert.equal(cols.int_key, 'M03:4001:25000:pm');
  assert.match(r.query, new RegExp(`create_notification\\(user_id: ${PM}`));
});

test('order 160,000 in budget → CEO tier (acceptance test 3)', async () => {
  const r = await run(order({ amount: 160000, quotes: true }), { col: 'status', label: 'הוגש לאישור' });
  assert.equal(r.decision, 'route-ceo');
  assert.equal(varsJson(r)[0].approval.label, 'ממתין מנכ״ל');
});

test('order 15,000 outside budget → VP tier', async () => {
  const r = await run(order({ amount: 15000, inBudget: 'לא' }), { col: 'status', label: 'הוגש לאישור' });
  assert.equal(r.decision, 'route-vp');
});

test('duplicate event (same amount + tier already routed) → skip', async () => {
  const r = await run(order({ key: 'M03:4001:25000:pm' }), { col: 'status', label: 'הוגש לאישור' });
  assert.equal(r.decision, 'duplicate');
  assert.equal(r.skip, true);
});

test('> 20,000 without framework price or 3 quotes → returned to draft with reason', async () => {
  const r = await run(order({ amount: 25000, quotes: false }), { col: 'status', label: 'הוגש לאישור' });
  assert.equal(r.decision, 'rejected');
  assert.deepEqual(r.reasons, ['מעל 20,000 ש״ח ללא מחיר מסגרת — נדרשות 3 הצעות']);
  const ok = await run(order({ amount: 25000, quotes: false, framework: true }), { col: 'status', label: 'הוגש לאישור' });
  assert.equal(ok.decision, 'route-pm');
});

test('blocked vendor / missing quotes / missing line → rejected, nothing routed', async () => {
  const r = await run(order({ amount: 45000, quotes: false, vendor: { compliance: 'פג תוקף', block: true }, noLine: true }), { col: 'status', label: 'הוגש לאישור' });
  assert.equal(r.decision, 'rejected');
  assert.equal(r.reasons.length, 3);
  assertGql(r.query);
  assert.equal(varsJson(r)[0].status.label, 'טיוטה');
  assert.doesNotMatch(r.query, /ממתין/);
});

test('approval by the project PM within PM tier → status מאושר + requester notified (A01)', async () => {
  const r = await run(order(), { col: 'approval', label: 'מאושר', user: PM });
  assert.equal(r.decision, 'approved');
  assert.equal(varsJson(r)[0].status.label, 'מאושר');
  assert.match(r.query, /create_notification\(user_id: 888/);
});

test('approval by someone outside the tier → reverted to waiting + VP alerted', async () => {
  const r = await run(order({ amount: 160000, quotes: true }), { col: 'approval', label: 'מאושר', user: PM });
  assert.equal(r.decision, 'unauthorized');
  assert.equal(varsJson(r)[0].approval.label, 'ממתין מנכ״ל');
});

test("M03's own waiting-label writes are ignored (no loops)", async () => {
  const r = await run(order(), { col: 'approval', label: 'ממתין מנהל פרויקט' });
  assert.equal(r.decision, 'ignored');
  assert.equal(r.skip, true);
});

const invoice = (o = {}) => ({
  id: '8001', name: 'חשבונית 123', column_values: [
    col('to_pay', String(o.toPay ?? 60000)), col('net_amount', String(o.net ?? 60000)), col('allocation_no', o.alloc ?? '123456789'),
    col('three_way', o.match ?? 'תואם'), col('int_key', o.key ?? ''),
    { id: 'vendor', text: '', value: null, linked_items: [vendor(o.vendor)] },
  ],
});

test('payment approval by VP over 50,000 → second approval required from the CEO', async () => {
  const r = await run(invoice(), { board: B.vinvoices, col: 'pay_approval', label: 'אושר', user: USERS.vp });
  assert.match(r.decision, /first-approval|approved/);
  assertGql(r.query);
});

test('payment approval by a PM → unauthorized (separation of duties)', async () => {
  const r = await run(invoice(), { board: B.vinvoices, col: 'pay_approval', label: 'אושר', user: PM });
  assert.equal(r.decision, 'unauthorized');
});

test('invoice 8,000 without allocation number → "דרוש תיקון" (acceptance test 6)', async () => {
  const r = await run(invoice({ toPay: 8000, net: 8000, alloc: '' }), { board: B.vinvoices, col: 'pay_approval', label: 'אושר', user: USERS.ceo });
  assert.equal(r.decision, 'rejected');
  assert.ok(r.reasons.some((x) => x.includes('מספר הקצאה')));
});

test('second approval by the same person who gave the first → rejected', async () => {
  const r = await run(invoice({ key: `M03:VI:8001:pay:${USERS.ceo}` }), { board: B.vinvoices, col: 'second_approval', label: 'אושר', user: USERS.ceo });
  assert.equal(r.decision, 'second-unauthorized');
});

const claim = (amount, type = 'דרישת קבלן משנה') => ({ id: '9001', name: 'דרישה', column_values: [col('change_type', type), col('amount', String(amount)), col('int_key', ''), { id: 'project', text: '', value: null, linked_items: [project] }] });

test('subcontractor claim 40,000 → VP tier; client change → no routing', async () => {
  const r = await run(claim(40000), { board: B.changes, col: 'status', label: 'הוגש' });
  assert.equal(r.decision, 'route-vp');
  assertGql(r.query);
  assert.doesNotMatch(JSON.stringify(r.vars), /int_status/);
  const c = await run(claim(40000, 'שינוי ללקוח'), { board: B.changes, col: 'status', label: 'הוגש' });
  assert.equal(c.decision, 'client-change-no-routing');
});

const lead = (o = {}) => ({ id: '3001', name: 'מכרז', column_values: [col('price', String(o.price ?? 900000)), col('margin', String(o.margin ?? 14)), col('min_margin', '12'), col('discount', String(o.discount ?? 1)), col('int_key', ''), col('owner', 'x', { personsAndTeams: [{ id: 555, kind: 'person' }] })] });

test('quote 2M → re-routed to CEO; low margin → CEO; normal → VP', async () => {
  assert.equal((await run(lead({ price: 2000000 }), { board: B.leads, col: 'approval', label: 'ממתין סמנכ״ל', prev: 'לא הוגש' })).decision, 'route-ceo');
  assert.equal((await run(lead({ margin: 9 }), { board: B.leads, col: 'approval', label: 'ממתין סמנכ״ל', prev: 'לא הוגש' })).decision, 'route-ceo');
  assert.equal((await run(lead(), { board: B.leads, col: 'approval', label: 'ממתין סמנכ״ל', prev: 'לא הוגש' })).decision, 'route-vp');
});
