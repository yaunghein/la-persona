ALTER TABLE "community_setting" ADD COLUMN "invite_token_expires_at" timestamp;--> statement-breakpoint
-- Existing join links stay valid for another 30 days instead of expiring at deploy.
UPDATE "community_setting" SET "invite_token_expires_at" = now() + interval '30 days' WHERE "invite_token_expires_at" IS NULL;
