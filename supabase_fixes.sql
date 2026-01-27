-- 1. Fix Leads Permissions
-- Allow public insert (vital for the Widget to work)
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."leads";
CREATE POLICY "Enable insert for everyone" ON "public"."leads" FOR INSERT TO public WITH CHECK (true);

-- Allow admins to view leads
DROP POLICY IF EXISTS "Enable read for authenticated users" ON "public"."leads";
CREATE POLICY "Enable read for authenticated users" ON "public"."leads" FOR SELECT TO authenticated USING (true);


-- 2. Fix Audit Logs
-- Ensure user_id column exists (it seemed missing in the script error)
ALTER TABLE "public"."audit_logs" ADD COLUMN IF NOT EXISTS "user_id" text; -- Using text to support 'anon' strings if needed, or uuid if strict

-- Allow insert to audit logs
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."audit_logs";
CREATE POLICY "Enable insert for everyone" ON "public"."audit_logs" FOR INSERT TO public WITH CHECK (true);
