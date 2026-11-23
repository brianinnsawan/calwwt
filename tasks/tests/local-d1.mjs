// Test-only stand-in for a Cloudflare D1 binding, backed by node:sqlite in memory.
// Never imported by the deployed Worker.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function localD1() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const f of ['0001_tasks.sql', '0002_hidden_from.sql', '0003_language.sql', '0004_page_access.sql', '0005_files.sql', '0006_trackers.sql', '0007_meetings.sql', '0008_meeting_docs.sql', '0009_repeat_days.sql', '0010_agent_keys.sql']) sql.exec(readFileSync(new URL(`../schema/${f}`, import.meta.url), 'utf8'));
  const norm = (v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v);
  // Cloudflare D1 takes at most 100 bound values in one query (plain SQLite takes 32,766). Refused here too, with D1's
  // wording, so a query that would fail on the live site fails in the tests.
  const MAX_VALUES = 100;
  const stmt = (query, values = []) => {
    const s = {
      bind: (...v) => { if (v.length > MAX_VALUES) throw new Error('D1_ERROR: too many SQL variables at offset 0: SQLITE_ERROR'); return stmt(query, v.map(norm)); },
      first: async () => sql.prepare(query).get(...values) ?? null,
      all: async () => ({ results: sql.prepare(query).all(...values), success: true }),
      run: async () => ({ success: true, meta: sql.prepare(query).run(...values) }),
      _exec: () => (/\bRETURNING\b/i.test(query) || /^\s*SELECT/i.test(query) ? sql.prepare(query).all(...values) : sql.prepare(query).run(...values)),
    };
    return s;
  };
  return {
    sql,
    prepare: (query) => stmt(query),
    async batch(list) {
      sql.exec('BEGIN');
      try { const out = list.map((s) => s._exec()); sql.exec('COMMIT'); return out; }
      catch (e) { sql.exec('ROLLBACK'); throw e; }
    },
  };
}
