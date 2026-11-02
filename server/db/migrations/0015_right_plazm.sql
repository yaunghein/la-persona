ALTER TABLE "contact_exchange" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD CONSTRAINT "contact_exchange_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_exchange_event_idx" ON "contact_exchange" USING btree ("event_id");