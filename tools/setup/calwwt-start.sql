-- calwwt.sppwork.com starting data (Brian, 23 Nov 2026). Run ONCE on the new, empty calwwt-tasks database, after
-- tasks/schema/0001 ... 0011 (tools/setup/README.md). It removes the NTI City Park starting rows those files add and puts in
-- the Caltex 2027 wastewater people, sites, folders and milestones. After this the Admin page is where people change.

-- NTI rows from the schema files
DELETE FROM milestones;
DELETE FROM page_access WHERE subject LIKE 'person:%';

-- People: SPP (Brian, Ming, Praew, Boss, Keng) and Caltex (Thada, Oat, Bas). Logins are made on the Admin page.
INSERT INTO people(id, name, company, level, title, aliases_json, hidden_from_json, safety_reports, quiet, active, language) VALUES
  ('brian', 'Brian', 'spp', 'admin', 'Project Manager (VP Operations)', '[]', '[]', 0, 0, 1, 'en'),
  ('ming', 'Ming', 'spp', 'admin', '', '[]', '[]', 0, 0, 1, 'th'),
  ('keng', 'Keng', 'spp', 'manager', 'Head Architect', '["P.Keng"]', '[]', 0, 0, 1, 'th'),
  ('praew', 'Praew', 'spp', 'staff', '', '[]', '[]', 0, 0, 1, 'th'),
  ('boss', 'Boss', 'spp', 'staff', '', '[]', '[]', 0, 0, 1, 'th'),
  ('thada', 'Thada', 'caltex', 'partner', 'Project Manager', '["P.Ex","K.Thada"]', '[]', 0, 0, 1, 'th'),
  ('oat', 'Oat', 'caltex', 'partner', 'Head of Safety', '["P.Oat"]', '[]', 0, 0, 1, 'th'),
  ('bas', 'Bas', 'caltex', 'partner', 'Overall Engineering Manager', '[]', '[]', 0, 0, 1, 'th');
INSERT INTO request_contacts VALUES ('brian', '*'), ('ming', '*');

-- Task areas = the 8 sites (plus "All sites" for work that covers several).
INSERT INTO areas VALUES
  ('all', 'All sites', 1), ('s0589', '0589 Kathu, Phuket', 2), ('s1156', '1156 Samut Prakan', 3), ('s1588', '1588 Samut Sakhon', 4),
  ('s1622', '1622 Ram Intra', 5), ('s1642', '1642 Phun Phon, Phuket', 6), ('s1687', '1687 Phetchaburi', 7),
  ('s1703', '1703 King Kaew', 8), ('s1750', '1750 Kaeng Khoi, Saraburi', 9);
INSERT INTO categories(id, name, position) VALUES
  ('general', 'General', 1), ('sampling', 'Sampling & lab results', 2), ('boq', 'BOQ & pricing', 3),
  ('engineering', 'Design & drawings', 4), ('safety', 'Safety', 5), ('client', 'Caltex requests', 6), ('misc', 'Misc', 7);
INSERT INTO counters VALUES ('CP', 0), ('RQ', 0);
INSERT INTO settings VALUES ('partnerDirectory', '{"caltex":["*spp"]}'), ('partnerPeers', '{"caltex":["caltex"]}');

-- Page access: SPP staff may also change the site timelines and milestones (Brian, 23 Nov 2026: small team).
INSERT INTO page_access(subject, page, level, updated_by, updated_at) VALUES ('group:spp', 'timeline', 'edit', 'brian', '2026-11-23T00:00:00.000Z');
INSERT INTO page_access_log(subject, page, level, changed_by, changed_at) VALUES ('group:spp', 'timeline', 'edit', 'brian', '2026-11-23T00:00:00.000Z');

-- Files: one folder per site, plus programme folders. (safety / engineering are built in and kept.)
INSERT OR IGNORE INTO file_folders(id, parent_id, name, caltex_rule, created_by, created_at) VALUES
  ('sites', NULL, 'สถานี · Sites', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-0589', 'sites', '0589 Kathu Phuket', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-1156', 'sites', '1156 Samut Prakan', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-1588', 'sites', '1588 Samut Sakhon', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-1622', 'sites', '1622 Ram Intra', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-1642', 'sites', '1642 Phun Phon Phuket', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-1687', 'sites', '1687 Phetchaburi', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-1703', 'sites', '1703 King Kaew', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-1750', 'sites', '1750 Kaeng Khoi Saraburi', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('reports', NULL, 'รายงานถึง Caltex · Reports to Caltex', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('reference', NULL, 'ข้อมูลอ้างอิง · Reference', '', 'brian', '2026-11-23T00:00:00.000Z');

-- Milestones (Milestones tab). Dates to confirm.
INSERT INTO milestones(id, grp, name, plan, actual, remarks, sort, updated_by, updated_at) VALUES
  ('S1', 'design', 'Site visits and water sampling (7 sites)', '2026-11-21', '2026-11-21', 'Saraburi (1750): date to confirm', 1, 'brian', '2026-11-23T00:00:00.000Z'),
  ('S2', 'design', 'Lab results, all sites (Aqua Nishihara)', '2026-12-04', NULL, 'Caltex parameters', 2, 'brian', '2026-11-23T00:00:00.000Z'),
  ('S3', 'design', 'Improvement BOQ and pricing', '2026-12-09', NULL, NULL, 3, 'brian', '2026-11-23T00:00:00.000Z'),
  ('S4', 'design', 'Results, drawings and pricing to Caltex', '2026-12-10', NULL, 'A few last site files may follow', 4, 'brian', '2026-11-23T00:00:00.000Z'),
  ('P1', 'permission', 'Permit drawings (2027 work package)', NULL, NULL, 'Next year', 5, 'brian', '2026-11-23T00:00:00.000Z'),
  ('C1', 'construction', 'Improvement works (2027 work package)', NULL, NULL, 'Next year', 6, 'brian', '2026-11-23T00:00:00.000Z');
