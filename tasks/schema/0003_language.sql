-- Default screen language per person ('th' or 'en'). Each browser can still switch.
ALTER TABLE people ADD COLUMN language TEXT NOT NULL DEFAULT 'th' CHECK(language IN('th','en'));
