CREATE TABLE "feedback_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_submission" ADD CONSTRAINT "feedback_submission_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_submission" ADD CONSTRAINT "feedback_submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_submission_org_idx" ON "feedback_submission" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "feedback_submission_user_idx" ON "feedback_submission" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_submission_kind_idx" ON "feedback_submission" USING btree ("kind");