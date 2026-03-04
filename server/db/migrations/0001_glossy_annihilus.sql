CREATE TABLE "card_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"plan_code" text,
	"status" text DEFAULT 'trial' NOT NULL,
	"is_trial" boolean DEFAULT true NOT NULL,
	"trial_start_at" timestamp,
	"trial_end_at" timestamp,
	"current_period_start_at" timestamp,
	"current_period_end_at" timestamp,
	"last_payment_item_id" text,
	"activated_at" timestamp,
	"expired_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_subscription_cardId_unique" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"billing_cycle" text DEFAULT 'yearly' NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plan_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscription_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"paid_by_user_id" text NOT NULL,
	"receipt_url" text NOT NULL,
	"payment_reference" text,
	"payment_method" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_payment_item" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"card_id" text NOT NULL,
	"plan_code" text NOT NULL,
	"term_years" integer DEFAULT 1 NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_subscription" ADD CONSTRAINT "card_subscription_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_subscription" ADD CONSTRAINT "card_subscription_last_payment_item_id_subscription_payment_item_id_fk" FOREIGN KEY ("last_payment_item_id") REFERENCES "public"."subscription_payment_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment_item" ADD CONSTRAINT "subscription_payment_item_payment_id_subscription_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."subscription_payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment_item" ADD CONSTRAINT "subscription_payment_item_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_subscription_status_idx" ON "card_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "card_subscription_period_end_idx" ON "card_subscription" USING btree ("current_period_end_at");--> statement-breakpoint
CREATE INDEX "subscription_payment_org_idx" ON "subscription_payment" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_payer_idx" ON "subscription_payment" USING btree ("paid_by_user_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_status_idx" ON "subscription_payment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscription_payment_item_payment_idx" ON "subscription_payment_item" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_item_card_idx" ON "subscription_payment_item" USING btree ("card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payment_item_payment_card_uidx" ON "subscription_payment_item" USING btree ("payment_id","card_id");