import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boards } from '../../schema.mjs';
import { mainOrder, views, dashboards, boardTabs, viewArgs, techFor } from '../../ui.mjs';

const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'));
// Live column ids per board: schema columns + reflection columns monday generated + subitems.
const live = Object.fromEntries(boards.map((b) => {
  const m = manifest.boards[b.key] || {};
  return [b.key, new Set(['name', ...(b.columns || []).map((c) => c.id), ...Object.values(m.reflections || {}), ...(m.subitemsColumn ? [m.subitemsColumn] : [])])];
}));

test('main order lists every non-technical column exactly once, and nothing that does not exist', () => {
  for (const b of boards) {
    const order = mainOrder[b.key];
    assert.ok(order, `mainOrder.${b.key} missing`);
    assert.equal(new Set(order).size, order.length, `${b.key}: duplicate in mainOrder`);
    assert.equal(order[0], 'name', `${b.key}: name must lead`);
    for (const c of order) assert.ok(live[b.key].has(c) || c.startsWith('board_relation_') || c.startsWith('subtasks_'), `${b.key}: unknown column ${c}`);
    const tech = new Set(techFor(b.key));
    for (const c of b.columns || []) if (!tech.has(c.id)) assert.ok(order.includes(c.id), `${b.key}: ${c.id} missing from mainOrder`);
  }
});

test('every view is built (has a live id), shows known columns, and orders all columns once', () => {
  const ids = new Set();
  for (const [key, list] of Object.entries(views)) {
    for (const v of list) {
      assert.match(v.id, /^\d+$/, `${key}/${v.name}: no live id`);
      assert.ok(!ids.has(v.id), `duplicate view id ${v.id}`);
      ids.add(v.id);
      for (const c of v.show) assert.ok(mainOrder[key].includes(c), `${key}/${v.name}: ${c} not in mainOrder`);
      const { settings } = viewArgs(key, manifest.boards[key].id, v);
      const order = settings.columns.column_order;
      assert.equal(new Set(order).size, order.length, `${key}/${v.name}: duplicate in column_order`);
      assert.equal(order.length, mainOrder[key].length + techFor(key).length);
      assert.deepEqual(order.slice(0, v.show.length), v.show);
      assert.equal(settings.columns.column_properties.length, order.length - v.show.length);
    }
  }
  assert.equal(ids.size, 24);
});

test('dashboards stay within Pro limits and skip journals / intlog', () => {
  const wids = new Set();
  for (const d of dashboards) {
    assert.match(d.id, /^\d+$/);
    assert.ok(d.boards.length <= 20, `${d.name}: >20 boards`);
    assert.ok(!d.boards.includes('journals') && !d.boards.includes('intlog'), `${d.name}: journals/intlog excluded per §12`);
    for (const [, name, id, src] of d.widgets) {
      assert.ok(!wids.has(id), `duplicate widget ${id}`);
      wids.add(id);
      const board = src.split(/[:.]/)[0];
      assert.ok(d.boards.includes(board), `${d.name}/${name}: board ${board} not on dashboard`);
    }
  }
  for (const t of boardTabs) for (const [, , id] of t.widgets) { assert.ok(!wids.has(id)); wids.add(id); }
  assert.equal(dashboards.length, 7);
});
