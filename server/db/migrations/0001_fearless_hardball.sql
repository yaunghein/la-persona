ALTER TABLE "contact_exchange_before_platform" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_exchange_before_platform" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "contact_exchange_before_platform" DROP COLUMN "updated_at";