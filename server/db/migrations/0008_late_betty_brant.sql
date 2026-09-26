ALTER TABLE "card" ADD COLUMN IF NOT EXISTS "phone_country_code" text;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD COLUMN IF NOT EXISTS "phone_country_code" text;
