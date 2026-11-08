CREATE TABLE "attendee_label" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" varchar(7) NOT NULL,
	"carries_over" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_label" (
	"registration_id" text NOT NULL,
	"label_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registration_label_registration_id_label_id_pk" PRIMARY KEY("registration_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "contact_label" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" varchar(7) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_label_assignment" (
	"contact_id" text NOT NULL,
	"label_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_label_assignment_contact_id_label_id_pk" PRIMARY KEY("contact_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "attendee_label" ADD CONSTRAINT "attendee_label_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_label" ADD CONSTRAINT "registration_label_registration_id_event_registration_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_label" ADD CONSTRAINT "registration_label_label_id_attendee_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."attendee_label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_label" ADD CONSTRAINT "contact_label_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_label_assignment" ADD CONSTRAINT "contact_label_assignment_contact_id_contact_exchange_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact_exchange"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_label_assignment" ADD CONSTRAINT "contact_label_assignment_label_id_contact_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."contact_label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendee_label_organization_name_uidx" ON "attendee_label" USING btree ("organization_id",lower("name"));--> statement-breakpoint
CREATE INDEX "registration_label_label_idx" ON "registration_label" USING btree ("label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_label_user_name_uidx" ON "contact_label" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "contact_label_assignment_label_idx" ON "contact_label_assignment" USING btree ("label_id");