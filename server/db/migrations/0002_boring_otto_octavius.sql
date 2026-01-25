CREATE TABLE "card_update_request" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"position" text,
	"phone" text,
	"email" text,
	"website" text,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"card_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_update_request" ADD CONSTRAINT "card_update_request_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_update_request" ADD CONSTRAINT "card_update_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "update_request_card_idx" ON "card_update_request" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "update_request_user_idx" ON "card_update_request" USING btree ("requested_by");