import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { B } from '../lib.mjs';

// Evaluates a Make filter (OR of AND-groups; exist / text:equal) against a monday webhook event.
const bp = (code) => JSON.parse(execFileSync('node', [new URL('../scenarios.mjs', import.meta.url).pathname, code], { encoding: 'utf8' })).blueprint;
const resolve = (expr, e) => expr.replace(/\{\{1\.event\.([\w.]+)\}\}/g, (_, path) => path.split('.').reduce((o, k) => o?.[k], e) ?? '');
const passes = (flt, e) => flt.conditions.some((g) => g.every((c) => (c.o === 'exist' ? resolve(c.a, e) !== '' : resolve(c.a, e) === c.b)));
const evt = (boardId, columnId, label, prev) => ({ pulseId: 1, boardId, columnId, value: { label: { text: label } }, previousValue: prev ? { label: { text: prev } } : null });

test('M09a filter: amounts/links always, approval and status only when a sum can change, echoes dropped', () => {
  const f = bp('M09a').flow.find((m) => m.id === 3).filter;
  assert.ok(passes(f, evt(B.orders, 'amount')));
  assert.ok(passes(f, evt(B.orders, 'approval', 'מאושר', 'ממתין סמנכ״ל')));
  assert.ok(passes(f, evt(B.orders, 'approval', 'טיוטה', 'מאושר')));
  assert.ok(passes(f, evt(B.orders, 'status', 'בוטל', 'נשלח לספק')));
  assert.ok(passes(f, evt(B.changes, 'status', 'אושר', 'הוגש')));
  assert.ok(passes(f, evt(B.changes, 'status', 'בוצע ללא אישור', 'בתמחור')));
  assert.ok(!passes(f, evt(B.orders, 'approval', 'ממתין סמנכ״ל', 'טיוטה'))); // M03 echo
  assert.ok(!passes(f, evt(B.orders, 'status', 'נשלח לספק', 'מאושר')));
  assert.ok(!passes(f, evt(B.changes, 'status', 'בתמחור', 'פוטנציאלי')));
  assert.ok(!passes(f, { challenge: 'x' })); // monday URL verification
});

test('M03 filter: only transitions M03 acts on; its own waiting/status echoes are dropped', () => {
  const f = bp('M03').flow.find((m) => m.id === 3).filter;
  assert.ok(passes(f, evt(B.orders, 'status', 'הוגש לאישור', 'טיוטה')));
  assert.ok(passes(f, evt(B.orders, 'approval', 'מאושר', 'ממתין מנכ״ל')));
  assert.ok(passes(f, evt(B.orders, 'approval', 'נדחה', 'ממתין מנכ״ל')));
  assert.ok(passes(f, evt(B.leads, 'approval', 'ממתין סמנכ״ל', 'לא הוגש')));
  assert.ok(passes(f, evt(B.vinvoices, 'pay_approval', 'אושר', 'ממתין')));
  assert.ok(passes(f, evt(B.vinvoices, 'second_approval', 'אושר', 'ממתין')));
  assert.ok(passes(f, evt(B.changes, 'status', 'הוגש', 'בתמחור')));
  assert.ok(!passes(f, evt(B.orders, 'approval', 'ממתין סמנכ״ל', 'טיוטה'))); // M03 echo on orders
  assert.ok(!passes(f, evt(B.orders, 'status', 'ממתין מנהל פרויקט', 'הוגש לאישור')));
  assert.ok(!passes(f, evt(B.orders, 'status', 'מאושר', 'ממתין מנכ״ל')));
  assert.ok(!passes(f, evt(B.vinvoices, 'second_approval', 'ממתין', 'לא נדרש')));
});

test('M02 filter: only won / signed', () => {
  const f = bp('M02').flow.find((m) => m.id === 3).filter;
  assert.ok(passes(f, evt(B.leads, 'stage', 'זכייה', 'משא ומתן')));
  assert.ok(passes(f, evt(B.leads, 'stage', 'חוזה נחתם', 'זכייה')));
  assert.ok(!passes(f, evt(B.leads, 'stage', 'הפסד', 'משא ומתן')));
});
