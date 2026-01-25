ALTER TABLE "card" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "socials" jsonb DEFAULT '[]'::jsonb;