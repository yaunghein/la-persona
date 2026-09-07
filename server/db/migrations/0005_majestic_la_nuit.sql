ALTER TABLE "community_setting" ALTER COLUMN "cover_url" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "community_setting" ALTER COLUMN "cover_url" DROP NOT NULL;