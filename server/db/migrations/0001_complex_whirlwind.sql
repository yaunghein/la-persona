ALTER TABLE "contact_exchange" ADD COLUMN "source" text DEFAULT 'public_form' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD COLUMN "la_persona_user_id" text;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD COLUMN "la_persona_card_id" text;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD COLUMN "reciprocal_exchange_id" text;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD CONSTRAINT "contact_exchange_la_persona_user_id_user_id_fk" FOREIGN KEY ("la_persona_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD CONSTRAINT "contact_exchange_la_persona_card_id_card_id_fk" FOREIGN KEY ("la_persona_card_id") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_exchange_la_persona_user_idx" ON "contact_exchange" USING btree ("la_persona_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_exchange_card_la_persona_user_uidx" ON "contact_exchange" USING btree ("card_id","la_persona_user_id");