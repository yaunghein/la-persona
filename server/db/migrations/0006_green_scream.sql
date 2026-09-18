CREATE TABLE "event_registration" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"checked_in_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_setting" ADD COLUMN "invite_token" text;--> statement-breakpoint
UPDATE "community_setting" SET "invite_token" = md5(random()::text || clock_timestamp()::text || id) WHERE "invite_token" IS NULL;--> statement-breakpoint
ALTER TABLE "community_setting" ALTER COLUMN "invite_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "community_setting" ADD COLUMN "spline_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "community_setting" ADD COLUMN "wallpaper_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "community_setting" ADD COLUMN "card_back_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "registration_mode" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "approval_mode" text DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_registration_event_user_uidx" ON "event_registration" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_registration_event_idx" ON "event_registration" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_registration_user_idx" ON "event_registration" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_setting_invite_token_uidx" ON "community_setting" USING btree ("invite_token");