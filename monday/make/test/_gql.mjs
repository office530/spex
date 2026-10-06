// Parses generated GraphQL so syntax errors fail locally instead of in Make.
// Uses the `graphql` package when it is installed (npm i graphql@16 in this folder or GRAPHQL_PKG=<path>).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

let parse = null;
for (const from of [process.env.GRAPHQL_PKG, new URL('../package.json', import.meta.url).pathname].filter(Boolean)) {
  try { parse = createRequire(from)('graphql').parse; break; } catch { /* not installed here */ }
}

export function assertGql(query) {
  assert.ok(query, 'empty query');
  if (parse) { parse(query); return; }
  // Fallback: bracket balance.
  for (const [o, c] of [['{', '}'], ['(', ')'], ['[', ']']]) {
    assert.equal(query.split(o).length, query.split(c).length, `unbalanced ${o}${c}`);
  }
}
