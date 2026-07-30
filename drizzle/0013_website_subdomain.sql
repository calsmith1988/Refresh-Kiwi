-- Owner-editable public label for {subdomain}.refreshkiwi.site. Null means
-- the website keeps using its slug. The slug remains the storage key.
ALTER TABLE "websites"
  ADD COLUMN IF NOT EXISTS "subdomain" text;

CREATE UNIQUE INDEX IF NOT EXISTS "websites_subdomain_idx"
  ON "websites" ("subdomain")
  WHERE "subdomain" IS NOT NULL;
