import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCode, B, USERS } from '../lib.mjs';
import { assertGql } from './_gql.mjs';

const col = (id, text, value) => ({ id, text, value: value === undefined ? null : JSON.stringify(value) });
const ppl = (id, uid) => col(id, 'x', { personsAndTeams: [{ id: uid, kind: 'person' }] });
const rel = (id, ids) => ({ id, text: '', value: null, linked_item_ids: ids.map(String) });
const page = (items) => [{ items_page: { cursor: null, items } }];
const run = (data, today) => runCode('A12_daily.js', { data, today }, 'A12', 'v1.0');
const jsonVars = (r) => Object.values(r.vars).filter((v) => typeof v === 'string' && v.startsWith('{')).map((v) => JSON.parse(v));
const names = (r) => Object.values(r.vars).filter((v) => typeof v === 'string' && !v.startsWith('{'));

test('A12 routines: Sunday 1st of a quarter → daily + weekly + monthly + quarterly items, keyed; re-run creates none', async () => {
  const r = await run({}, '2026-11-01'); // Sunday, 1 Nov (not a quarter month) → OD, OW, OM1, OM2, VD, VW, VY(11/1)
  assertGql(r.query);
  assert.equal(r.counts.routines, 7);
  const keys = jsonVars(r).map((v) => v.int_key).filter(Boolean);
  assert.ok(keys.includes('A12:OM1:2026-11-01') && keys.includes('A12:VY:2026-11-01'));
  assert.equal(jsonVars(r).find((v) => v.int_key === 'A12:OM1:2026-11-01').due.date, '2026-11-05');
  const keyed = page(keys.map((k, i) => ({ id: String(i), column_values: [col('int_key', k)] })));
  const again = await run({ keyed }, '2026-11-01');
  assert.equal(again.counts.routines, 0);
  const fri = await run({}, '2026-10-02'); // Friday, not a routine day
  assert.equal(fri.counts.routines, 0);
  const q = await run({}, '2026-10-01'); // Thursday 1 Oct: daily ×2 + monthly ×2 + quarterly ×2
  assert.equal(q.counts.routines, 6);
});

test('A14/A15 renewals: ≤60 days → one task for the owner; 14 days → owner + VP; renewed items ignored', async () => {
  const renewals = page([
    { id: '1', name: 'ביטוח צד ג׳', column_values: [col('r_type', 'פוליסה'), col('expiry', '2026-11-20'), ppl('owner', 4242), col('renewal_status', 'בתוקף')] },
    { id: '2', name: 'רישיון רכב', column_values: [col('r_type', 'רכב-רישיון'), col('expiry', '2026-10-17'), col('renewal_status', 'בתהליך')] },
    { id: '3', name: 'דומיין', column_values: [col('r_type', 'דומיין/אתר'), col('expiry', '2026-10-10'), col('renewal_status', 'חודש')] },
  ]);
  const r = await run({ renewals }, '2026-10-03');
  assertGql(r.query);
  const tasks = jsonVars(r).filter((v) => v.int_key?.startsWith('A14:'));
  assert.equal(tasks.length, 2);
  const policy = tasks.find((t) => t.int_key === 'A14:1:2026-11-20');
  assert.deepEqual(policy.owner.personsAndTeams[0].id, 4242);
  assert.deepEqual(policy.domain.labels, ['ביטוח']);
  assert.equal(policy.due.date, '2026-10-21'); // 30 days before expiry
  assert.match(r.query, new RegExp(`create_notification\\(user_id: ${USERS.vp}`)); // 14-day reminder for the car licence
  const again = await run({ renewals, keyed: page([{ id: 'k', column_values: [col('int_key', 'A14:1:2026-11-20')] }, { id: 'k2', column_values: [col('int_key', 'A14:2:2026-10-17')] }]) }, '2026-10-04');
  assert.equal(jsonVars(again).filter((v) => v.int_key?.startsWith('A14:')).length, 0);
});

test('guarantees, defects, safety, urgent changes, decision queue', async () => {
  const projects = page([{ id: '100', name: 'P', column_values: [ppl('pm', 501), ppl('site_mgr', 502)] }]);
  const data = {
    projects,
    guarantees: page([{ id: '20', name: 'ערבות ביצוע X', column_values: [col('g_type', 'ערבות ביצוע'), col('expiry', '2026-10-30'), col('status', 'בתוקף')] }]),
    defects: page([
      { id: '30', name: 'רטיבות', column_values: [col('due', '2026-10-03'), col('status', 'פתוח'), rel('project', [100])] },
      { id: '31', name: 'אריח שבור', column_values: [col('due', '2026-10-01'), col('status', 'בטיפול'), rel('project', [100])] },
    ]),
    findings: page([{ id: '40', name: 'מעקה חסר', column_values: [col('close_due', '2026-09-30'), col('finding_status', 'פתוח'), rel('project', [100])] }]),
    notices: page([{ id: '41', name: 'עבודה בגובה', column_values: [col('notice_due', '2026-10-04'), col('notice_ref', ''), rel('project', [100])] }]),
    urgent: page([{ id: '50', name: 'תוספת שקעים', column_values: [col('urgent_date', '2026-09-26'), col('approval_file', ''), col('status', 'בוצע ללא אישור'), rel('project', [100])] }]),
    decisions: page([
      { id: '60', name: 'בחירת קבלן חשמל', column_values: [ppl('owner', USERS.ceo), col('decision_helper', '')] },
      { id: '61', name: 'מחיר חדש', column_values: [ppl('owner', USERS.ceo), col('decision_helper', '2026-09-27')] },
    ]),
    helpers: page([{ id: '62', name: 'הוחלט', column_values: [col('decision_helper', '2026-09-01')] }]),
  };
  const r = await run(data, '2026-10-03');
  assertGql(r.query);
  assert.deepEqual(r.counts, { routines: 0, renewals: 0, guarantees: 1, defects: 2, safety: 2, changes: 1, decisions: 2 });
  const cvs = jsonVars(r);
  assert.ok(cvs.some((v) => v.status?.label === 'לחידוש'));
  assert.ok(cvs.some((v) => v.finding_status?.label === 'הוסלם'));
  assert.ok(cvs.some((v) => v.decision_helper?.date === '2026-10-03'));
  assert.ok(cvs.some((v) => 'decision_helper' in v && v.decision_helper === null));
  assert.match(r.query, /create_notification\(user_id: 502/); // site manager: defect +2 days, finding escalation, notice
  assert.match(r.query, /create_notification\(user_id: 501/); // PM: defect due today (no owner), urgent change
  assert.ok(names(r).some((t) => t.includes('ממתין להחלטתך 6 ימים')));
  assert.match(r.query, new RegExp(`change_multiple_column_values\\(board_id: ${B.safety}`));
});
