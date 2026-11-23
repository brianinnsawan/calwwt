-- NTI City Park task app. Cloudflare D1 (SQLite).
-- History tables (events, completion snapshots, request messages) are append-only.

CREATE TABLE people(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL CHECK(company IN('spp','caltex','ks','owner')),
  level TEXT NOT NULL CHECK(level IN('admin','manager','staff','observer','team','partner')),
  title TEXT NOT NULL DEFAULT '',
  aliases_json TEXT NOT NULL DEFAULT '[]',
  hidden_from_partners INTEGER NOT NULL DEFAULT 0,
  safety_reports INTEGER NOT NULL DEFAULT 0,
  quiet INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  account_id TEXT UNIQUE,             -- identity account (nti-city-park-identity) linked to this person
  CHECK((company='spp') = (level<>'partner'))
);
CREATE TABLE reports_to(person_id TEXT NOT NULL REFERENCES people(id), boss_id TEXT NOT NULL REFERENCES people(id), PRIMARY KEY(person_id,boss_id), CHECK(person_id<>boss_id));
CREATE TABLE follows(person_id TEXT NOT NULL REFERENCES people(id), followed_id TEXT NOT NULL REFERENCES people(id), PRIMARY KEY(person_id,followed_id), CHECK(person_id<>followed_id));
CREATE TABLE request_contacts(sender_id TEXT NOT NULL REFERENCES people(id), recipient_id TEXT NOT NULL, PRIMARY KEY(sender_id,recipient_id)); -- recipient '*' = any partner
CREATE TABLE settings(key TEXT PRIMARY KEY, value_json TEXT NOT NULL);

CREATE TABLE areas(id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL);
CREATE TABLE categories(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_by TEXT, archived INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 100);

CREATE TABLE counters(name TEXT PRIMARY KEY, value INTEGER NOT NULL);

CREATE TABLE tasks(
  id TEXT PRIMARY KEY,                -- CP-001
  kind TEXT NOT NULL DEFAULT 'task' CHECK(kind IN('task','followup')),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 300),
  description TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL REFERENCES areas(id),
  category TEXT NOT NULL REFERENCES categories(id),
  status TEXT NOT NULL CHECK(status IN('todo','doing','hold','review','done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN('urgent','high','normal','low')),
  start_date TEXT, due_date TEXT, followup_date TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
  auto_progress INTEGER NOT NULL DEFAULT 0,
  creator_id TEXT NOT NULL REFERENCES people(id),
  lead_id TEXT REFERENCES people(id),
  parent_id TEXT REFERENCES tasks(id),
  request_id TEXT,
  repeat TEXT NOT NULL DEFAULT '' CHECK(repeat IN('','weekly')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  closed_at TEXT, closed_by TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE task_people(task_id TEXT NOT NULL REFERENCES tasks(id), person_id TEXT NOT NULL REFERENCES people(id), role TEXT NOT NULL CHECK(role IN('assignee','shared')), PRIMARY KEY(task_id,person_id));
CREATE TABLE checklist(id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE comments(id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), by_id TEXT NOT NULL, at TEXT NOT NULL, body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000));

-- Append-only history. Names are stored as ids and rendered per viewer.
CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, request_id TEXT, at TEXT NOT NULL, by_id TEXT NOT NULL, kind TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}');
CREATE TABLE completion_snapshots(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL, at TEXT NOT NULL, by_id TEXT NOT NULL, snapshot_json TEXT NOT NULL);

CREATE TABLE requests(
  id TEXT PRIMARY KEY,                -- RQ-001
  sender_id TEXT NOT NULL REFERENCES people(id),
  recipient_id TEXT NOT NULL REFERENCES people(id),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 300),
  message TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT 'misc', category TEXT NOT NULL DEFAULT 'general',
  due_date TEXT,
  status TEXT NOT NULL CHECK(status IN('open','answered','closed')),
  followup_task_id TEXT REFERENCES tasks(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE request_messages(id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL REFERENCES requests(id), by_id TEXT NOT NULL, at TEXT NOT NULL, body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000));

CREATE TABLE notifications(id INTEGER PRIMARY KEY AUTOINCREMENT, to_id TEXT NOT NULL, from_id TEXT, kind TEXT NOT NULL, task_id TEXT, request_id TEXT, data_json TEXT NOT NULL DEFAULT '{}', at TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0);

CREATE INDEX tasks_status ON tasks(status, deleted);
CREATE INDEX task_people_person ON task_people(person_id);
CREATE INDEX events_task ON events(task_id);
CREATE INDEX notifications_to ON notifications(to_id, read);

CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER snapshots_no_update BEFORE UPDATE ON completion_snapshots BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER snapshots_no_delete BEFORE DELETE ON completion_snapshots BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER request_messages_no_update BEFORE UPDATE ON request_messages BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER request_messages_no_delete BEFORE DELETE ON request_messages BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER comments_no_update BEFORE UPDATE ON comments BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER comments_no_delete BEFORE DELETE ON comments BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER tasks_no_delete BEFORE DELETE ON tasks BEGIN SELECT RAISE(ABORT,'USE_SOFT_DELETE'); END;
