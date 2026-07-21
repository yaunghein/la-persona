ALTER TABLE "organization" ADD COLUMN "type" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
UPDATE "organization" SET "type" = 'personal' WHERE "is_personal" = true;--> statement-breakpoint
UPDATE "organization" SET "type" = 'personal' WHERE "is_personal" = false;
