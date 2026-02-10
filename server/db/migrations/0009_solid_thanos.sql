CREATE TABLE "analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"metadata" jsonb,
	"organization_id" text NOT NULL,
	"card_id" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_org_idx" ON "analytics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "analytics_card_idx" ON "analytics" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "analytics_type_date_idx" ON "analytics" USING btree ("type","created_at");