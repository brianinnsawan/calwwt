# Restoring calwwt.sppwork.com from a backup

One page. Pick the smallest fix that solves the problem. Never overwrite a live database: restore into a new one, check it, then switch over.

## Where the backups are

| What | Where | Kept |
|---|---|---|
| Database "undo" (D1 Time Travel) | Built into Cloudflare D1, for every database | 30 days, to the minute |
| Weekly copy (every Sunday 02:00 Bangkok time) | R2 bucket **calwwt-backups** (private, locked) | Locked for 90 days, then kept until removed |
| Monthly download | Admin → Backups → **Download backup**, saved in the project SharePoint folder | As long as SharePoint keeps it |

Inside **calwwt-backups**:
- `d1/<date>T<time>/<db>.json` holds every table of `tasks`, `identity`, `portal`. The `identity` copy includes password hashes, so people keep their passwords after a restore. Sign-in sessions and setup codes are not included.
- `objects/<original key>@<etag>` holds every version of every uploaded file. Project files are `objects/files/<id>@…`; the `files` table in `tasks` gives each file's name and folder.
- `runs/<date>T<time>-<id>.json` records what each run copied.

The downloaded zip has the same data in `data/*.json` (without password hashes), plus `files/<folder>/<name>` and `files/index.csv`.

## 1. One file deleted or overwritten by mistake

Deleted files and older versions are never removed from storage (Files only hides them).
1. Find the file in `tasks` → `files` (D1 console: `SELECT id, name, r2_key, deleted, uploaded_at FROM files WHERE name LIKE '%…%'`).
2. Undelete it: `UPDATE files SET deleted=0, deleted_by=NULL, deleted_at=NULL WHERE id='…'`. If a newer upload with the same name exists, rename one of them first.
3. If the stored object itself is gone, copy `objects/<r2_key>@…` from **calwwt-backups** back to `<r2_key>` in **calwwt-files** (R2 dashboard: download, then upload).

## 2. Wrong data in the last 30 days (bad edit, bad import)

Use D1 Time Travel. It restores the whole database to a minute in time. Anything changed after that minute is lost, so first export or note the newer changes.

```bash
npx wrangler d1 time-travel info calwwt-tasks --timestamp "2026-11-20T10:00:00+07:00"
```

```bash
npx wrangler d1 time-travel restore calwwt-tasks --timestamp "2026-11-20T10:00:00+07:00"
```

Databases: `calwwt-tasks` (tasks, people, page access, files list, trackers, meetings), `calwwt-identity` (logins, sign-in history) and `calwwt-portal` (owner record). The restore command prints a bookmark you can use to undo the restore itself.

## 3. Older than 30 days, or a database is lost

Rebuild the database from a weekly copy into a NEW database, then point the site at it.
1. Download `d1/<date>T<time>/tasks.json` (or `identity.json`) from **calwwt-backups**, or use `data/tasks.json` from a downloaded zip.
2. Turn it into SQL:
   ```bash
   node tools/backup/restore-d1.mjs tasks.json > restore.sql
   ```
   To restore only some tables into a scratch database for comparison, add `--tables files,file_folders`.
3. Create the new database and load the SQL:
   ```bash
   npx wrangler d1 create calwwt-tasks-restored
   ```
   ```bash
   npx wrangler d1 execute calwwt-tasks-restored --remote --file restore.sql
   ```
4. Check it in the D1 console (row counts, a few known items).
5. Put the new `database_id` in `production/wrangler.jsonc` for that binding, commit and merge. Workers Builds deploys it. The old database stays untouched until you delete it.

2-step sign-in secrets in the weekly copy are encrypted with the Worker secret `AUTH_RATE_KEY`; keep that secret unchanged, or admins set 2-step up again (Account page) after an admin removes it. Logins restored from a downloaded zip have no passwords and no 2-step. Each person then needs a setup code (Admin → People & logins). The owner uses owner recovery on the old address.

## 4. File storage lost

Copy every `objects/<key>@<etag>` from **calwwt-backups** back to `<key>` in a new or emptied bucket. Where one key has several versions, use the newest. A downloaded zip holds the current version of every file under `files/`; their storage keys are the `files` table's `r2_key` values.

## After any restore

- Sign in as an admin and check Files, Meetings, Milestones and Admin → Sign-ins.
- Press **Back up now** (Admin → Backups) so the restored state is copied too.
- Note what was restored and why in the Meetings notes or the Change log.
