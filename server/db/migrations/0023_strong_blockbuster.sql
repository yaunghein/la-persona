CREATE TABLE "card_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"user_id" text,
	"holder_name" text NOT NULL,
	"holder_email" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"ended_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"spline_url" text DEFAULT '' NOT NULL,
	"wallpaper_url" text DEFAULT '' NOT NULL,
	"card_back_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retired_card_slug" (
	"slug" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"retired_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_payment" DROP CONSTRAINT "subscription_payment_paid_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription_payment_item" DROP CONSTRAINT "subscription_payment_item_card_id_card_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription_payment" ALTER COLUMN "paid_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_payment_item" ALTER COLUMN "card_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics" ADD COLUMN "card_assignment_id" text;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "card_id" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "department_id" text;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD COLUMN "card_assignment_id" text;--> statement-breakpoint
ALTER TABLE "card_assignment" ADD CONSTRAINT "card_assignment_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_assignment" ADD CONSTRAINT "card_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_assignment" ADD CONSTRAINT "card_assignment_ended_by_user_id_user_id_fk" FOREIGN KEY ("ended_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_setting" ADD CONSTRAINT "company_setting_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retired_card_slug" ADD CONSTRAINT "retired_card_slug_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_assignment_card_idx" ON "card_assignment" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_assignment_user_idx" ON "card_assignment" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "card_assignment_open_uidx" ON "card_assignment" USING btree ("card_id") WHERE "card_assignment"."ended_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "company_setting_organization_uidx" ON "company_setting" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_organization_name_uidx" ON "department" USING btree ("organization_id","name");--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_card_assignment_id_card_assignment_id_fk" FOREIGN KEY ("card_assignment_id") REFERENCES "public"."card_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD CONSTRAINT "contact_exchange_card_assignment_id_card_assignment_id_fk" FOREIGN KEY ("card_assignment_id") REFERENCES "public"."card_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment_item" ADD CONSTRAINT "subscription_payment_item_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_assignment_idx" ON "analytics" USING btree ("card_assignment_id");--> statement-breakpoint
CREATE INDEX "invitation_cardId_idx" ON "invitation" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_department_idx" ON "card" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "contact_exchange_assignment_idx" ON "contact_exchange" USING btree ("card_assignment_id");--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;