ALTER TABLE "community_setting" ADD COLUMN "email_qr_background_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "community_setting" ADD COLUMN "email_contact_exchange_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "community_setting" ADD COLUMN "email_after_event_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "reminder_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "after_event_email_sent_at" timestamp;