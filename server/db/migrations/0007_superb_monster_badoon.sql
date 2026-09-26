CREATE INDEX IF NOT EXISTS "analytics_org_created_idx" ON "analytics" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_org_type_created_idx" ON "analytics" USING btree ("organization_id","type","created_at");
