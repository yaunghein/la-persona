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
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	"is_personal" boolean DEFAULT false NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_request" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_receipt_url" text NOT NULL,
	"card_data" jsonb DEFAULT '{}'::jsonb,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "card" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"slug" text NOT NULL,
	"position" text NOT NULL,
	"spline_url" text,
	"company" text,
	"phone" text,
	"email" text,
	"website" text,
	"avatar_url" text,
	"socials" jsonb DEFAULT '[]'::jsonb,
	"wallpaper_url" text,
	"qr_code_url" text,
	"card_back_url" text,
	"organization_id" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_exchange_before_platform" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"position" text,
	"owner_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_exchange" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"company" text,
	"position" text,
	"card_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"billing_cycle" text DEFAULT 'yearly' NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'MMK' NOT NULL,
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
	"request_id" text,
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
	"currency" text DEFAULT 'MMK' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_request" ADD CONSTRAINT "card_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_subscription" ADD CONSTRAINT "card_subscription_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_subscription" ADD CONSTRAINT "card_subscription_plan_code_subscription_plan_code_fk" FOREIGN KEY ("plan_code") REFERENCES "public"."subscription_plan"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_subscription" ADD CONSTRAINT "card_subscription_last_payment_item_id_subscription_payment_item_id_fk" FOREIGN KEY ("last_payment_item_id") REFERENCES "public"."subscription_payment_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_update_request" ADD CONSTRAINT "card_update_request_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_update_request" ADD CONSTRAINT "card_update_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_exchange" ADD CONSTRAINT "contact_exchange_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_request_id_card_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."card_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment_item" ADD CONSTRAINT "subscription_payment_item_payment_id_subscription_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."subscription_payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment_item" ADD CONSTRAINT "subscription_payment_item_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment_item" ADD CONSTRAINT "subscription_payment_item_plan_code_subscription_plan_code_fk" FOREIGN KEY ("plan_code") REFERENCES "public"."subscription_plan"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_org_idx" ON "analytics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "analytics_card_idx" ON "analytics" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "analytics_type_date_idx" ON "analytics" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "card_request_user_idx" ON "card_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "card_subscription_status_idx" ON "card_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "card_subscription_period_end_idx" ON "card_subscription" USING btree ("current_period_end_at");--> statement-breakpoint
CREATE INDEX "update_request_card_idx" ON "card_update_request" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "update_request_user_idx" ON "card_update_request" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "card_user_idx" ON "card" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_exchange_card_idx" ON "contact_exchange" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_org_idx" ON "subscription_payment" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_payer_idx" ON "subscription_payment" USING btree ("paid_by_user_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_status_idx" ON "subscription_payment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscription_payment_item_payment_idx" ON "subscription_payment_item" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_item_card_idx" ON "subscription_payment_item" USING btree ("card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payment_item_payment_card_uidx" ON "subscription_payment_item" USING btree ("payment_id","card_id");