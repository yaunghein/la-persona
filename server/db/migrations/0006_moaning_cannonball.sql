ALTER TABLE "card" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_slug_unique" UNIQUE("slug");