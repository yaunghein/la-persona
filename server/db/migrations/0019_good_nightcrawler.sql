ALTER TABLE "event_registration" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "guest_name" text;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "guest_phone" text;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "guest_phone_country_code" text;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "guest_company" text;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "guest_position" text;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "guest_note" text;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_user_or_guest_chk" CHECK ("event_registration"."user_id" is not null or "event_registration"."guest_name" is not null);