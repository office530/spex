#!/usr/bin/env node
// Generates the GraphQL mutations that provision the boards in schema.mjs.
// Usage:
//   node monday/gen.mjs boards                 → create all boards (needs manifest.workspaces)
//   node monday/gen.mjs build <boardKey>       → name column, columns, formulas, groups
//   node monday/gen.mjs deferred               → mirrors whose source board is built later
//   node monday/gen.mjs subitems <boardKey>    → columns on the subitems board (needs manifest)
//   node monday/gen.mjs reflections-query      → query to locate auto-created reflection columns
// The output is pasted into the "RNVT | Monday GraphQL Runner" Make tool; IDs that come back
// are recorded in manifest.json so the next steps (and every Make scenario) can reference them.
import { readFileSync } from 'node:fs';
import { boards, workspaces, statusColors, DONE_LABELS } from './schema.mjs';

const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const q = (s) => JSON.stringify(s); // GraphQL string literal (JSON escaping is compatible)
const byKey = Object.fromEntries(boards.map((b) => [b.key, b]));
const boardId = (key) => {
  const id = manifest.boards?.[key]?.id;
  if (!id) throw new Error(`board ${key} not in manifest`);
  return id;
};

function columnMutation(alias, bid, col, after, boardKey) {
  const common = `board_id: ${bid}, id: ${q(col.id)}, title: ${q(col.title)}` +
    (col.description ? `, description: ${q(col.description)}` : '') +
    (after ? `, after_column_id: ${q(after)}` : '');
  switch (col.type) {
    case 'status': {
      const colors = statusColors(col.labels);
      const labels = col.labels
        .map((l, i) => `{ color: ${colors[i]}, label: ${q(l)}, index: ${i}${DONE_LABELS.has(l) ? ', is_done: true' : ''} }`)
        .join(', ');
      return `${alias}: create_status_column(${common}, defaults: { labels: [ ${labels} ] }) { id }`;
    }
    case 'dropdown': {
      const labels = (col.labels ?? []).map((l) => `{ label: ${q(l)} }`).join(', ');
      return `${alias}: create_dropdown_column(${common}, defaults: { labels: [ ${labels} ] }) { id }`;
    }
    case 'auto_number':
      return `${alias}: create_column(${common}, column_type: auto_number, defaults: ${q(JSON.stringify({ settings: { scope: 'board', prefix: col.prefix, order: 'ascending' } }))}) { id }`;
    case 'formula':
      return `${alias}: create_column(${common}, column_type: formula, defaults: ${q(JSON.stringify({ settings: { formula: col.formula } }))}) { id }`;
    case 'relation':
      return `${alias}: create_column(${common}, column_type: board_relation, defaults: ${q(JSON.stringify({
        boardIds: [Number(boardId(col.target))],
        allowMultipleItems: !col.single,
        allowCreateReflectionColumn: Boolean(col.reflect),
      }))}) { id }`;
    case 'mirror':
      return `${alias}: create_column(${common}, column_type: mirror, defaults: ${q(JSON.stringify({
        settings: {
          // A relation may be an auto-created reflection column; resolve its real id from the manifest.
          relation_column: { [manifest.boards[boardKey]?.reflections?.[col.relation] ?? col.relation]: true },
          displayed_linked_columns: [{ board_id: String(boardId(col.from)), column_ids: [col.column] }],
        },
      }))}) { id }`;
    default:
      return `${alias}: create_column(${common}, column_type: ${col.type}) { id }`;
  }
}

function buildBoard(key) {
  const b = byKey[key];
  const bid = boardId(key);
  const out = [`nm: change_column_title(board_id: ${bid}, column_id: "name", title: ${q(b.nameTitle)}) { id }`];
  const cols = b.columns.filter((c) => !c.deferred);
  // Pass 1: everything except formulas, in display order.
  cols.forEach((c, i) => { if (c.type !== 'formula') out.push(columnMutation(`c${i}`, bid, c, undefined, key)); });
  // Pass 2: formulas, placed right after their display-order predecessor (which exists by now).
  cols.forEach((c, i) => {
    if (c.type === 'formula') out.push(columnMutation(`c${i}`, bid, c, i === 0 ? 'name' : cols[i - 1].id, key));
  });
  // Groups: create_group puts new groups on top, so create in reverse to keep the spec order.
  [...b.groups].reverse().forEach((g, i) => out.push(`g${i}: create_group(board_id: ${bid}, group_name: ${q(g)}) { id title }`));
  out.push(`dg: delete_group(board_id: ${bid}, group_id: "topics") { id }`);
  return `mutation { ${out.join(' ')} }`;
}

function createBoards() {
  const out = boards.map((b) => {
    const ws = manifest.workspaces[b.ws];
    return `${b.key}: create_board(board_name: ${q(b.name)}, board_kind: ${b.kind}, workspace_id: ${ws}, empty: true, description: ${q(b.description)}) { id }`;
  });
  return `mutation { ${out.join(' ')} }`;
}

function deferred() {
  const out = [];
  for (const b of boards) {
    b.columns.forEach((c, i) => {
      if (c.deferred) out.push(columnMutation(`${b.key}_${c.id}`, boardId(b.key), c, i === 0 ? 'name' : b.columns[i - 1].id, b.key));
    });
  }
  return `mutation { ${out.join(' ')} }`;
}

function subitems(key) {
  const b = byKey[key];
  const sid = manifest.boards[key].subitemsBoardId;
  if (!sid) throw new Error(`no subitemsBoardId for ${key}`);
  const out = [`nm: change_column_title(board_id: ${sid}, column_id: "name", title: ${q(b.subitems.nameTitle)}) { id }`];
  b.subitems.columns.forEach((c, i) => out.push(columnMutation(`c${i}`, sid, c)));
  for (const def of ['person', 'status', 'date0']) out.push(`d_${def}: delete_column(board_id: ${sid}, column_id: ${q(def)}) { id }`);
  return `mutation { ${out.join(' ')} }`;
}

function reflectionsQuery() {
  const targets = new Set();
  for (const b of boards) for (const c of b.columns) if (c.reflect) targets.add(boardId(c.target));
  return `{ boards(ids: [${[...targets].join(', ')}]) { id name columns(types: [board_relation]) { id title settings } } }`;
}

const [cmd, arg] = process.argv.slice(2);
const commands = {
  boards: createBoards,
  build: () => buildBoard(arg),
  deferred,
  subitems: () => subitems(arg),
  'reflections-query': reflectionsQuery,
};
if (!commands[cmd]) {
  console.error(`unknown command ${cmd}; one of ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}
process.stdout.write(commands[cmd]() + '\n');
void workspaces;
