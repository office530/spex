#!/usr/bin/env node
// Make blueprints for spec v2 wave 1 (monday-only scenarios).
// Usage: node monday/make/scenarios.mjs <code>   → prints {name, blueprint, scheduling, interface?}
import { readFileSync } from 'node:fs';
import {
  manifest, B, G, USERS, NOW_DATE, NOW_TIME, gql, router, setVars, iterator, webhook, challenge,
  filter, eq, neq, exists, scenarioMeta, onError, resetDesigner, codeModule, LBL,
} from './lib.mjs';

const ids = JSON.parse(readFileSync(new URL('./ids.json', import.meta.url), 'utf8')); // scenario + hook ids once created

// ───────────────────────── M17 · log + error handler (sub-scenario) ─────────────────────────
// Called by every scenario. Writes one row to "יומן אינטגרציות"; failures also notify the VP (§8.7.2).
function M17() {
  resetDesigner();
  const input = [
    { name: 'scenario', type: 'text', required: true, help: 'קוד התרחיש, למשל M03' },
    { name: 'version', type: 'text' },
    { name: 'result', type: 'text', help: 'הצליח / דולג / נכשל / הוסלם (ברירת מחדל: נכשל)' },
    { name: 'source_board', type: 'text' },
    { name: 'source_item', type: 'text' },
    { name: 'int_key', type: 'text' },
    { name: 'error', type: 'text', multiline: true, help: 'הודעת שגיאה או הערה' },
  ];
  const result = '{{ifempty(1.result; "נכשל")}}';
  const okGroup = G.intlog['הצליח (סיכום יומי)'];
  const isOk = `{{switch(ifempty(1.result; "נכשל"); "הצליח"; "${okGroup}"; "דולג"; "${okGroup}"; "${G.intlog['נכשל']}")}}`;
  const cv = `{"scenario":{"labels":["{{1.scenario}}"]},"version":"{{1.version}}","result":{"label":"${result}"},` +
    `"source_board":"{{1.source_board}}","source_item":"{{1.source_item}}","int_key":"{{1.int_key}}",` +
    `"run_time":{"date":"{{formatDate(now; "YYYY-MM-DD"; "UTC")}}","time":"${NOW_TIME}"}}`;
  const flow = [
    { id: 1, module: 'scenario-service:StartSubscenario', version: 2, metadata: { interface: input } },
    gql(2, `mutation ($name: String!, $cv: JSON!) { create_item(board_id: ${B.intlog}, group_id: "${isOk}", item_name: $name, column_values: $cv, create_labels_if_missing: true) { id } }`,
      [['name', '{{1.scenario}} · {{ifempty(1.source_item; "-")}} · ' + result], ['cv', cv]]),
    router(3, [
      [gql(4, `mutation ($v: String!) { change_simple_column_value(board_id: ${B.intlog}, item_id: {{2.body.data.create_item.id}}, column_id: "error", value: $v) { id } }`,
        [['v', '{{1.error}}']], { filter: filter('יש טקסט שגיאה', [exists('{{1.error}}')]) })],
      [gql(5, `mutation ($t: String!) { create_notification(user_id: ${USERS.vp}, target_id: {{2.body.data.create_item.id}}, text: $t, target_type: Project) { text } }`,
        [['t', '⚠️ {{1.scenario}} נכשל: {{substring(ifempty(1.error; "ללא פירוט"); 0; 200)}}']],
        { filter: filter('רק כשל', [neq(result, 'הצליח'), neq(result, 'דולג')]) })],
    ]),
  ];
  return {
    name: 'M17_בקרה_יומן-ושגיאות_v1.0',
    scheduling: { type: 'on-demand' },
    blueprint: { name: 'M17_בקרה_יומן-ושגיאות_v1.0', flow, metadata: scenarioMeta() },
    interface: { input, output: [] },
  };
}

// Pre-filters on the webhook event: only changes that can move a number pass to the fetch (2 ops instead of 5–7 for
// every echo of our own writes and every irrelevant status move — the bulk of Make credits, §8.6).
const ev = { id: '{{1.event.pulseId}}', col: '{{1.event.columnId}}', label: '{{1.event.value.label.text}}', prev: '{{1.event.previousValue.label.text}}', board: '{{1.event.boardId}}' };
const real = exists(ev.id);
// M09a: amounts and links always; approval only into/out of "מאושר"; status only into/out of the labels the sums use
// (orders "בוטל"; changes "אושר" / "חויב" / "בוצע ללא אישור").
const M09A_RELEVANT = [
  ...['amount', 'budget_line', 'cost'].map((c) => [real, eq(ev.col, c)]),
  [real, eq(ev.col, 'approval'), eq(ev.label, 'מאושר')], [real, eq(ev.col, 'approval'), eq(ev.prev, 'מאושר')],
  ...['בוטל', 'אושר', 'חויב', 'בוצע ללא אישור'].flatMap((l) => [[real, eq(ev.col, 'status'), eq(ev.label, l)], [real, eq(ev.col, 'status'), eq(ev.prev, l)]]),
];
// M03: exactly the transitions M03_decide.js acts on. Waiting labels only on leads (on orders they are M03's own echo).
const M03_RELEVANT = (leads) => [
  [real, eq(ev.label, 'הוגש לאישור')], [real, eq(ev.label, 'הוגש')], [real, eq(ev.label, 'אושר')],
  [real, eq(ev.col, 'approval'), eq(ev.label, 'מאושר')], [real, eq(ev.col, 'approval'), eq(ev.label, 'נדחה')],
  [real, eq(ev.board, String(leads)), eq(ev.label, 'ממתין סמנכ״ל')], [real, eq(ev.board, String(leads)), eq(ev.label, 'ממתין מנכ״ל')],
];

// ───────────────────────── M09a · budget line recompute (instant) ─────────────────────────
// monday webhooks: orders(approval,status,amount,budget_line) + changes(status,cost,amount,budget_line) → hook.
function M09a() {
  resetDesigner();
  const code = 'M09a', version = 'v1.0';
  const notSkip = (m) => filter('יש מה לעשות', [neq(`{{${m}.result.skip}}`, 'true')]);
  const flow = [
    webhook(1, ids.hooks.M09a),
    challenge(2, 1),
    gql(3, 'query { items(ids: [{{1.event.pulseId}}]) { id bl: column_values(ids: ["budget_line"]) { ... on BoardRelationValue { linked_item_ids } } pr: column_values(ids: ["project"]) { ... on BoardRelationValue { linked_item_ids } } } }', [],
      { filter: filter('שינוי שמשפיע על התקציב', ...M09A_RELEVANT), onerror: onError(3, { code, version, sourceBoard: '{{1.event.boardId}}', sourceItem: '{{1.event.pulseId}}' }) }),
    codeModule(4, 'M09a_plan.js', code, version, {
      items: '{{3.body.data.items}}', boardId: '{{1.event.boardId}}', columnId: '{{1.event.columnId}}',
      prev: '{{1.event.previousValue}}', changedAt: '{{1.event.changedAt}}',
    }),
    gql(5, '{{4.result.query}}', [], { filter: notSkip(4), onerror: onError(5, { code, version, sourceBoard: '{{1.event.boardId}}', sourceItem: '{{1.event.pulseId}}' }) }),
    codeModule(6, 'M09a_compute.js', code, version, {
      data: '{{5.body.data}}', lines: '{{4.result.lines}}', projects: '{{4.result.projects}}', changedAt: '{{1.event.changedAt}}',
    }),
    gql(7, '{{6.result.query}}', [], { filter: notSkip(6), onerror: onError(7, { code, version, sourceBoard: 'שורות תקציב', sourceItem: '{{4.result.lines}}' }) }),
  ];
  flow[6].mapper.variablesDataSource = 'object';
  flow[6].mapper.variables = '{{6.result.vars}}';
  const name = `${code}_כספים_חישוב-שורת-תקציב_${version}`;
  return { name, scheduling: { type: 'immediately' }, blueprint: { name, flow, metadata: scenarioMeta({ instant: true, dlq: true }) } };
}

// ───────────────────────── M03 · approval routing + approver verification (instant) ─────────────────────────
// monday webhooks: orders(status, approval) · leads(approval) · vinvoices(pay_approval, second_approval) · changes(status) → hook.
function M03() {
  resetDesigner();
  const code = 'M03', version = 'v1.0';
  const err = (m) => onError(m, { code, version, sourceBoard: '{{1.event.boardId}}', sourceItem: '{{1.event.pulseId}}' });
  const flow = [
    webhook(1, ids.hooks.M03),
    challenge(2, 1),
    gql(3, 'query { items(ids: [{{1.event.pulseId}}]) { id name board { id } column_values { id text value ... on BoardRelationValue { linked_items { id name column_values { id text value } } } } } u: users(ids: [{{ifempty(1.event.userId; 0)}}]) { id name } }', [],
      { filter: filter('מעבר שדורש החלטה', ...M03_RELEVANT(B.leads)), onerror: err(3) }),
    codeModule(4, 'M03_decide.js', code, version, {
      items: '{{3.body.data.items}}', users: '{{3.body.data.u}}', boardId: '{{1.event.boardId}}', columnId: '{{1.event.columnId}}',
      label: '{{1.event.value.label.text}}', prevLabel: '{{1.event.previousValue.label.text}}', userId: '{{1.event.userId}}', changedAt: '{{1.event.changedAt}}',
    }),
    gql(5, '{{4.result.query}}', [], { filter: filter('יש מה לעשות', [neq('{{4.result.skip}}', 'true')]), onerror: err(5) }),
  ];
  flow[4].mapper.variablesDataSource = 'object';
  flow[4].mapper.variables = '{{4.result.vars}}';
  const name = `${code}_בקרה_ניתוב-אישורים_${version}`;
  return { name, scheduling: { type: 'immediately' }, blueprint: { name, flow, metadata: scenarioMeta({ instant: true, dlq: true }) } };
}

// ───────────────────────── scheduled scenarios: fetch → code → write ─────────────────────────
const relCols = (ids) => `column_values(ids: ${JSON.stringify(ids)}) { id text value ... on BoardRelationValue { linked_item_ids } }`;
const pageQ = (alias, board, cols, params = '') =>
  `${alias}: boards(ids: [${B[board]}]) { items_page(limit: 500${params ? `, query_params: ${params}` : ''}) { cursor items { id name ${relCols(cols)} } } }`;

function scheduled(code, title, version, file, query, scheduling, sourceBoard) {
  resetDesigner();
  const err = (m) => onError(m, { code, version, sourceBoard });
  const flow = [
    gql(1, `query { ${query.join(' ')} }`, [], { onerror: err(1) }),
    codeModule(2, file, code, version, { data: '{{1.body.data}}' }),
    gql(3, '{{2.result.query}}', [], { filter: filter('יש מה לכתוב', [neq('{{2.result.skip}}', 'true')]), onerror: err(3) }),
  ];
  flow[2].mapper.variablesDataSource = 'object';
  flow[2].mapper.variables = '{{2.result.vars}}';
  const name = `${code}_${title}_${version}`;
  return { name, scheduling, blueprint: { name, flow, metadata: scenarioMeta({ dlq: true }) } };
}

const M07 = () => scheduled('M07', 'ספקים_ציות-יומי', 'v1.0', 'M07_compliance.js',
  [pageQ('vendors', 'vendors', ['vendor_type', 'insurance_exp', 'wht_exp', 'books_exp', 'manpower_exp', 'compliance', 'pay_block'])],
  { type: 'daily', time: '06:00' }, 'ספקים וקבלני משנה');
const M08 = () => scheduled('M08', 'כספים_סולם-גבייה', 'v1.0', 'M08_collection.js',
  [pageQ('bills', 'billing', ['approved_amt', 'paid', 'due', 'collection', 'project']), pageQ('projects', 'projects', ['pm'])],
  { type: 'daily', time: '07:00' }, 'חשבונות חלקיים וגבייה');
const M09b = () => scheduled('M09b', 'כספים_התאמה-לילית', 'v1.0', 'M09b_reconcile.js', [
  pageQ('lines', 'budget', ['commitments', 'approved_changes']),
  pageQ('orders', 'orders', ['budget_line', 'amount', 'approval', 'status']),
  pageQ('changes', 'changes', ['budget_line', 'project', 'change_type', 'status', 'amount', 'cost']),
  pageQ('defects', 'defects', ['project', 'status']),
  pageQ('projects', 'projects', ['open_defects', 'unapproved_changes', 'approved_changes']),
], { type: 'daily', time: '02:00' }, 'שורות תקציב');
const M11b = () => scheduled('M11b', 'שטח_יומן-חסר', 'v1.1', 'M11b_journals.js', [
  pageQ('projects', 'projects', ['phase', 'missing_journals', 'site_mgr', 'pm', 'int_key']),
  pageQ('journals', 'journals', ['date', 'project'], '{ order_by: [{ column_id: "date", direction: desc }] }'),
], { type: 'weekly', days: [0, 1, 2, 3, 4], time: '17:00' }, 'יומני עבודה');
const A17 = () => scheduled('A17', 'בטיחות_סיור-שבועי-חסר', 'v1.1', 'A17_safety.js', [
  pageQ('projects', 'projects', ['phase', 'site_mgr', 'pm', 'int_key']),
  pageQ('safety', 'safety', ['rec_type', 'date', 'project'], '{ order_by: [{ column_id: "date", direction: desc }] }'),
  pageQ('tasks', 'tasks', ['int_key'], '{ rules: [{ column_id: "int_key", compare_value: ["A17:"], operator: contains_text }] }'),
], { type: 'weekly', days: [4], time: '12:00' }, 'בטיחות');
const rules = (...r) => `{ rules: [${r.join(', ')}], operator: and }`;
const rl = (col, op, vals = []) => `{ column_id: "${col}", compare_value: ${JSON.stringify(vals)}, operator: ${op} }`;
const A12 = () => scheduled('A12', 'בקרה_שגרות-ותאריכים', 'v1.0', 'A12_daily.js', [
  pageQ('keyed', 'tasks', ['int_key'], `{ rules: [${rl('int_key', 'is_not_empty')}], order_by: [{ column_id: "created", direction: desc }] }`),
  pageQ('decisions', 'tasks', ['owner', 'decision_helper'], rules(rl('status', 'any_of', [LBL.taskDecision]))),
  pageQ('helpers', 'tasks', ['decision_helper'], rules(rl('decision_helper', 'is_not_empty'), rl('status', 'not_any_of', [LBL.taskDecision]))),
  pageQ('renewals', 'renewals', ['r_type', 'expiry', 'owner', 'renewal_status']),
  pageQ('guarantees', 'guarantees', ['g_type', 'expiry', 'status']),
  pageQ('defects', 'defects', ['due', 'owner', 'status', 'project'], rules(rl('status', 'any_of', LBL.defectOpen))),
  pageQ('findings', 'safety', ['close_due', 'finding_status', 'project'], rules(rl('finding_status', 'any_of', LBL.findingOpen))),
  pageQ('notices', 'safety', ['notice_due', 'notice_ref', 'performer', 'project'], rules(rl('rec_type', 'any_of', [LBL.noticeRequired]))),
  pageQ('urgent', 'changes', ['urgent_date', 'approval_file', 'owner', 'status', 'project'], rules(rl('urgent_date', 'is_not_empty'))),
  pageQ('projects', 'projects', ['pm', 'site_mgr']),
], { type: 'daily', time: '05:30' }, 'משימות ותפעול שוטף');
const M16 = () => scheduled('M16', 'בקרה_בדיקת-דופק', 'v1.0', 'M16_heartbeat.js',
  [pageQ('log', 'intlog', ['scenario', 'run_time', 'result', 'handled'], '{ order_by: [{ column_id: "created", direction: desc }] }')],
  { type: 'daily', time: '08:00' }, 'יומן אינטגרציות');

// ───────────────────────── M02 · win → project (instant) ─────────────────────────
// monday webhook: leads(stage) → hook. Only "זכייה" / "חוזה נחתם" pass the filter, so other stage moves cost 2 ops.
function M02() {
  resetDesigner();
  const code = 'M02', version = 'v1.0';
  const err = (m) => onError(m, { code, version, sourceBoard: 'לידים והזדמנויות', sourceItem: '{{1.event.pulseId}}' });
  const won = (label) => [exists('{{1.event.pulseId}}'), eq('{{1.event.value.label.text}}', label)];
  const flow = [
    webhook(1, ids.hooks.M02),
    challenge(2, 1),
    gql(3, `query { lead: items(ids: [{{1.event.pulseId}}]) { id name ${relCols(['rec_id', 'company', 'price', 'expected_value', 'project'])} } ` +
      `${pageQ('projects', 'projects', ['project_code', 'int_key', manifest.boards.projects.reflections.lead], '{ order_by: [{ column_id: "created", direction: desc }] }')} }`, [],
      { filter: filter('זכייה / חוזה נחתם', won('זכייה'), won('חוזה נחתם')), onerror: err(3) }),
    codeModule(4, 'M02_win.js', code, version, { data: '{{3.body.data}}' }),
    gql(5, '{{4.result.query}}', [], { filter: filter('יש מה לעשות', [neq('{{4.result.skip}}', 'true')]), onerror: err(5) }),
  ];
  flow[4].mapper.variablesDataSource = 'object';
  flow[4].mapper.variables = '{{4.result.vars}}';
  const name = `${code}_מכירות_זכייה-לפרויקט_${version}`;
  return { name, scheduling: { type: 'immediately' }, blueprint: { name, flow, metadata: scenarioMeta({ instant: true, dlq: true }) } };
}

const builders = { M17, M09a, M03, M02, M07, M08, M09b, M11b, A17, A12, M16 };
const code = process.argv[2];
if (!builders[code]) { console.error(`unknown scenario ${code}; one of ${Object.keys(builders).join(', ')}`); process.exit(1); }
process.stdout.write(JSON.stringify(builders[code](), null, 1) + '\n');
void [iterator, setVars, eq, NOW_DATE, router];
