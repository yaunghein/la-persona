CREATE TABLE "onboarding_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"organization_id" text NOT NULL,
	"card_id" text NOT NULL,
	"subscription_plan_code" text NOT NULL,
	"free_months" integer DEFAULT 0 NOT NULL,
	"expiration_minutes" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"accepted_by_user_id" text,
	"accepted_at" timestamp,
	"last_sent_at" timestamp,
	"resend_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_invitation" ADD CONSTRAINT "onboarding_invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_invitation" ADD CONSTRAINT "onboarding_invitation_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_invitation" ADD CONSTRAINT "onboarding_invitation_subscription_plan_code_subscription_plan_code_fk" FOREIGN KEY ("subscription_plan_code") REFERENCES "public"."subscription_plan"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_invitation" ADD CONSTRAINT "onboarding_invitation_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_invitation" ADD CONSTRAINT "onboarding_invitation_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboarding_invitation_email_idx" ON "onboarding_invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "onboarding_invitation_status_idx" ON "onboarding_invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_invitation_expires_at_idx" ON "onboarding_invitation" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "onboarding_invitation_org_idx" ON "onboarding_invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "onboarding_invitation_card_idx" ON "onboarding_invitation" USING btree ("card_id");