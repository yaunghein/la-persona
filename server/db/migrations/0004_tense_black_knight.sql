CREATE TABLE "community_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cover_url" text DEFAULT '/images/reveal-image.webp' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"guidelines" text DEFAULT '' NOT NULL,
	"why_join" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_setting" ADD CONSTRAINT "community_setting_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_setting_organization_uidx" ON "community_setting" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "is_personal";