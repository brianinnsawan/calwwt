-- Per-company hiding: a person can be hidden from Caltex, KS Consulting and/or the land owner separately.
-- Replaces the all-or-nothing hidden_from_partners flag (kept for compatibility, no longer read).
ALTER TABLE people ADD COLUMN hidden_from_json TEXT NOT NULL DEFAULT '[]';
UPDATE people SET hidden_from_json='["caltex","ks","owner"]' WHERE hidden_from_partners=1;
