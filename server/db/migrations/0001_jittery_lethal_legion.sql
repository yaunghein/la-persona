CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "card" ALTER COLUMN "type" SET DEFAULT 'standard'::text;--> statement-breakpoint
DROP TYPE "public"."card_type";--> statement-breakpoint
CREATE TYPE "public"."card_type" AS ENUM('founders_club', 'standard');--> statement-breakpoint
ALTER TABLE "card" ALTER COLUMN "type" SET DEFAULT 'standard'::"public"."card_type";--> statement-breakpoint
ALTER TABLE "card" ALTER COLUMN "type" SET DATA TYPE "public"."card_type" USING "type"::"public"."card_type";--> statement-breakpoint
ALTER TABLE "card" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;