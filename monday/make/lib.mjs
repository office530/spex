// Shared building blocks for the Make blueprints (spec §8.2, §8.7).
import { readFileSync } from 'node:fs';

export const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
export const B = Object.fromEntries(Object.entries(manifest.boards).map(([k, v]) => [k, v.id]));
export const G = Object.fromEntries(Object.entries(manifest.boards).map(([k, v]) => [k, v.groups]));
export const CONN = 8321682; // "My Monday v2 connection" (rnvt)
export const TEAM = 89151;
export const FOLDER = 537514; // "RNVT OS v2 — אפיון monday"

// Who gets notified. The spec routes most alerts to the VP (סמנכ״ל); until a VP is named the CEO receives them.
export const USERS = {
  ceo: manifest.users.ceo.id,
  vp: manifest.users.vp?.id ?? manifest.users.ceo.id,
  office: manifest.users.office_manager.id,
};

export const NOW_DATE = '{{formatDate(now; "YYYY-MM-DD"; "Asia/Jerusalem")}}';
export const NOW_TIME = '{{formatDate(now; "HH:mm:ss"; "UTC")}}';

let designerX = 0;
const meta = () => ({ designer: { x: (designerX += 300), y: 0 } });

/** monday "Execute a GraphQL Query". Free text must travel in `variables`, never inline in the query. */
export function gql(id, queryBody, variables = [], extra = {}) {
  return {
    id,
    module: 'monday:ExecuteGraphQLQueryV2',
    version: 2,
    parameters: { __IMTCONN__: CONN },
    mapper: { method: 'POST', queryBody, variables: variables.map(([key, value]) => ({ key, value })), variablesDataSource: 'array' },
    metadata: meta(),
    ...extra,
  };
}

export const router = (id, routes) => ({ id, module: 'builtin:BasicRouter', version: 1, mapper: null, metadata: meta(), routes: routes.map((flow) => ({ flow })) });
export const setVars = (id, vars) => ({
  id, module: 'util:SetVariables', version: 1, metadata: meta(),
  mapper: { scope: 'roundtrip', variables: Object.entries(vars).map(([name, value]) => ({ name, value })) },
});
export const iterator = (id, array) => ({ id, module: 'builtin:BasicFeeder', version: 1, mapper: { array }, metadata: meta() });
export const webhook = (id, hookId) => ({ id, module: 'gateway:CustomWebHook', version: 1, parameters: { hook: hookId, maxResults: 1 }, mapper: {}, metadata: meta() });
// monday verifies a webhook URL by POSTing {"challenge": "..."}; echo it on every request (harmless for real events).
export const challenge = (id, hookModuleId) => ({
  id, module: 'gateway:WebhookRespond', version: 1, parameters: {}, metadata: meta(),
  mapper: { status: '200', body: `{"challenge": "{{${hookModuleId}.challenge}}"}`, headers: [] },
});

/** Filter helpers: AND inside one group, OR between groups. */
export const filter = (name, ...orGroups) => ({ name, conditions: orGroups });
export const eq = (a, b) => ({ a, o: 'text:equal', b });
export const neq = (a, b) => ({ a, o: 'text:notequal', b });
export const exists = (a) => ({ a, o: 'exist' });

export function scenarioMeta({ instant = false, dlq = false } = {}) {
  return {
    instant,
    version: 1,
    designer: { orphans: [] },
    scenario: {
      dlq, slots: null, dataloss: false, maxErrors: 3, autoCommit: true, roundtrips: 1,
      // sequential processing makes Make queue webhook calls, which breaks the Webhook Response monday needs for verification.
      sequential: false, confidential: false, freshVariables: false, autoCommitTriggerLast: true,
    },
  };
}

/**
 * Error route (§8.2.3, M17 inline): log the failure to "יומן אינטגרציות", notify the VP, then Break =
 * 3 automatic retries 5 minutes apart (needs "store incomplete executions" = dlq on the scenario).
 * Make's API can't create "Call a scenario" modules, so the M17 logic is generated into every route.
 */
export function onError(failedModuleId, { code, version, sourceBoard = '', sourceItem = '', intKey = '' }) {
  const f = failedModuleId;
  const cv = `{"scenario":{"labels":["${code}"]},"version":"${version}","result":{"label":"נכשל"},` +
    `"source_board":"${sourceBoard}","source_item":"${sourceItem}","int_key":"${intKey}",` +
    `"run_time":{"date":"{{formatDate(now; "YYYY-MM-DD"; "UTC")}}","time":"{{formatDate(now; "HH:mm:ss"; "UTC")}}"}}`;
  return [
    gql(900 + f, `mutation ($name: String!, $cv: JSON!) { create_item(board_id: ${B.intlog}, group_id: "${G.intlog['נכשל']}", item_name: $name, column_values: $cv, create_labels_if_missing: true) { id } }`,
      [['name', `${code} · נכשל · {{${f}.error.type}}`], ['cv', cv]]),
    gql(920 + f, `mutation ($err: String!, $t: String!) { e: change_simple_column_value(board_id: ${B.intlog}, item_id: {{${900 + f}.body.data.create_item.id}}, column_id: "error", value: $err) { id } ` +
      `n: create_notification(user_id: ${USERS.vp}, target_id: {{${900 + f}.body.data.create_item.id}}, text: $t, target_type: Project) { text } }`,
      [['err', `{{${f}.error.message}}`], ['t', `⚠️ ${code} נכשל (ניסיון חוזר אוטומטי בעוד 5 דק׳): {{substring(${f}.error.message; 0; 180)}}`]]),
    { id: 960 + f, module: 'builtin:Break', version: 1, mapper: { retry: true, count: 3, interval: 5 }, metadata: meta() },
  ];
}

export const resetDesigner = () => { designerX = 0; };

// ───────────────────── "Run code" steps ─────────────────────
// Label ids are the monday status-label ids (they equal the colour index the label was created with).
export const LBL = {
  orderApproved: 1, orderCancelled: 10, // orders.approval "מאושר", orders.status "בוטל" (moved off id 5 = monday's empty label)
  changeApproved: [1, 6], changeUnapproved: 11, // changes.status "אושר","חויב" / "בוצע ללא אישור"
  subClaim: 4, clientChange: 7, // changes.change_type
};

export function consts(code, version) {
  return {
    code, version,
    board: B,
    group: { logOk: G.intlog['הצליח (סיכום יומי)'], logFail: G.intlog['נכשל'], tasksWeek: G.tasks['השבוע'], projectsSetup: G.projects['הקמה'] },
    lbl: LBL,
    users: USERS,
  };
}

const codeDir = new URL('./code/', import.meta.url);
export function codeSource(file, code, version) {
  const prelude = readFileSync(new URL('_prelude.js', codeDir), 'utf8');
  const body = readFileSync(new URL(file, codeDir), 'utf8');
  // Full-line comments and indentation are stripped to keep blueprints small; the repo copy stays readable.
  const slim = (src) => src.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n');
  return `// ${code} ${version} · ${file} · generated from monday/make/code (do not edit in Make)\nconst C = ${JSON.stringify(consts(code, version))};\n${slim(prelude)}\n${slim(body)}`;
}

export function codeModule(id, file, code, version, input, extra = {}) {
  return {
    id, module: 'code:ExecuteCode', version: 0, metadata: meta(),
    mapper: { language: 'javascript', inputFormat: 'editor', input: Object.entries(input).map(([name, value]) => ({ name, value })), codeEditorJavascript: codeSource(file, code, version) },
    ...extra,
  };
}

/** Run a code step locally (tests). */
export async function runCode(file, input, code = 'TEST', version = 'test') {
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  return new AsyncFunction('input', codeSource(file, code, version))(input);
}
