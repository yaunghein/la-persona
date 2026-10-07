CREATE TABLE "user_daily_activity" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "user_daily_activity_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "user_daily_activity" ADD CONSTRAINT "user_daily_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;