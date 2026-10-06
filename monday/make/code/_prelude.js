// Prepended to every Make "Run code" step (after `const C = {...}`, generated from manifest.json).
// Pattern for every scenario: fetch from monday → decide here → one GraphQL write built here.
// Everything free-text travels as a GraphQL variable, so quotes/newlines can never break a query.

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;
const cvText = (item, id) => (item?.column_values ?? []).find((c) => c.id === id)?.text ?? '';
const isDemo = (item) => cvText(item, 'int_key').startsWith('DEMO'); // demo/sandbox rows (monday/demo) — scheduled checks skip them
const cvValue = (item, id) => {
  const raw = (item?.column_values ?? []).find((c) => c.id === id)?.value;
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
};
const personIds = (item, id) => (cvValue(item, id)?.personsAndTeams ?? []).filter((p) => p.kind === 'person').map((p) => Number(p.id));
const linkedIds = (item, id) => (cvValue(item, id)?.linkedPulseIds ?? []).map((x) => Number(x.linkedPulseId));
const todayIL = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10); // Israel date (UTC+2/+3; +3 keeps late-evening runs on the right day)
const daysBetween = (fromISO, toISO) => Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86400000);

const rule = (column_id, compare_value, operator = 'any_of') =>
  `{ column_id: "${column_id}", compare_value: ${JSON.stringify(compare_value)}, operator: ${operator} }`;
const aggSum = (alias, boardId, rules, column) =>
  `${alias}: aggregate(query: { from: { type: TABLE, id: ${boardId} }, query: { rules: [ ${rules.join(', ')} ], operator: and }, ` +
  `select: [ { type: FUNCTION, function: { function: SUM, params: [ { type: COLUMN, column: { column_id: "${column}" }, as: "${column}" } ] }, as: "v" } ] }) ` +
  `{ results { entries { value { ... on AggregateBasicAggregationResult { result } } } } }`;
const aggVal = (data, alias) => num(data?.[alias]?.results?.[0]?.entries?.[0]?.value?.result);

/** Collects GraphQL operations + typed variables into one request. */
function mutationBuilder() {
  const decl = [];
  const ops = [];
  const vars = {};
  let n = 0;
  return {
    v(type, value) {
      const k = `v${n++}`;
      decl.push(`$${k}: ${type}`);
      vars[k] = value;
      return `$${k}`;
    },
    op(s) { ops.push(s); },
    get size() { return ops.length; },
    build(extra = {}) {
      const head = decl.length ? `mutation (${decl.join(', ')})` : 'mutation';
      return { skip: ops.length === 0, query: ops.length ? `${head} { ${ops.join(' ')} }` : '', vars, count: ops.length, ...extra };
    },
  };
}

/** One row in "יומן אינטגרציות" (§5.19). */
function logRow(mb, alias, { result = 'הצליח', sourceBoard = '', sourceItem = '', intKey = '', name, note = '' }) {
  const now = new Date().toISOString();
  const ok = result === 'הצליח' || result === 'דולג';
  const cv = {
    scenario: { labels: [C.code] }, version: C.version, result: { label: result },
    source_board: String(sourceBoard), source_item: String(sourceItem), int_key: String(intKey),
    run_time: { date: now.slice(0, 10), time: now.slice(11, 19) },
  };
  if (note) cv.error = { text: String(note).slice(0, 2000) };
  mb.op(`${alias}: create_item(board_id: ${C.board.intlog}, group_id: "${ok ? C.group.logOk : C.group.logFail}", ` +
    `item_name: ${mb.v('String!', String(name).slice(0, 250))}, column_values: ${mb.v('JSON!', JSON.stringify(cv))}, create_labels_if_missing: true) { id }`);
}

/** In-app monday notification (bell). target = item id. */
function notify(mb, alias, userId, itemId, text) {
  if (!userId || !itemId) return;
  mb.op(`${alias}: create_notification(user_id: ${Number(userId)}, target_id: ${Number(itemId)}, text: ${mb.v('String!', String(text).slice(0, 500))}, target_type: Project) { text }`);
}

/** Update (comment) on an item — the audit trail people actually read. */
function update(mb, alias, itemId, body) {
  mb.op(`${alias}: create_update(item_id: ${Number(itemId)}, body: ${mb.v('String!', String(body))}) { id }`);
}

/** items of an aliased `boards(ids:[…]) { items_page { cursor items { … } } }` fetch. */
const pageItems = (data, alias) => data?.[alias]?.[0]?.items_page?.items ?? [];
const truncated = (data, ...aliases) => aliases.filter((a) => data?.[a]?.[0]?.items_page?.cursor);
const relIds = (item, id) => ((item?.column_values ?? []).find((c) => c.id === id)?.linked_item_ids ?? []).map(Number);
