ALTER TABLE "card" ADD COLUMN "slug" text;
UPDATE "card"
SET "slug" = lower(
  regexp_replace(
    trim(coalesce("name", 'card')) || '-' || substring("id" from 1 for 8),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
WHERE "slug" IS NULL OR "slug" = '';
ALTER TABLE "card" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "card" ADD CONSTRAINT "card_slug_unique" UNIQUE("slug");