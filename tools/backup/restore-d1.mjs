#!/usr/bin/env node
// Turn one database backup (d1/<stamp>/<db>.json from the calnkt-backups bucket, or data/<db>.json from an Admin
// "Download backup" zip) into an SQL file that rebuilds that database in a NEW, EMPTY D1 database.
//   node tools/backup/restore-d1.mjs <backup.json> > restore.sql
//   node tools/backup/restore-d1.mjs <backup.json> --tables files,file_folders > part.sql   (only some tables)
// Then: npx wrangler d1 execute <new-database-name> --remote --file restore.sql
// See docs/RESTORE.md. It never touches a live database by itself.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'object' && Array.isArray(v.$bytes)) return `X'${Buffer.from(v.$bytes).toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const quote = (n) => `"${String(n).replace(/"/g, '""')}"`;

export function restoreSql(dump, { tables = null } = {}) {
  if (dump?.format !== 'calnkt-d1-backup/1') throw new Error('Not a calnkt database backup.');
  const want = (name) => !tables || tables.includes(name);
  const out = [`-- Restore of "${dump.database}" from the backup taken ${dump.at}. Run on a NEW, EMPTY database.`, 'PRAGMA defer_foreign_keys = true;'];
  for (const s of dump.schema.filter((x) => x.type === 'table' && want(x.name))) out.push(s.sql.replace(/^CREATE TABLE (?!IF NOT EXISTS)/i, 'CREATE TABLE IF NOT EXISTS ') + ';');
  for (const [name, t] of Object.entries(dump.tables)) {
    if (!want(name)) continue;
    if (t.removed?.length) out.push(`-- ${name}: ${t.removed.join(', ')} not in this backup (left empty).`);
    const cols = t.columns.map(quote).join(', ');
    for (const row of t.rows) out.push(`INSERT INTO ${quote(name)} (${cols}) VALUES (${row.map(lit).join(', ')});`);
  }
  // Indexes and triggers last, so history locks do not block the restore itself.
  for (const s of dump.schema.filter((x) => x.type !== 'table' && want(x.table))) out.push(s.sql + ';');
  return out.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [file, flag, list] = process.argv.slice(2);
  if (!file) { console.error('Usage: node tools/backup/restore-d1.mjs <backup.json> [--tables a,b] > restore.sql'); process.exit(2); }
  process.stdout.write(restoreSql(JSON.parse(readFileSync(file, 'utf8')), { tables: flag === '--tables' && list ? list.split(',') : null }));
}
