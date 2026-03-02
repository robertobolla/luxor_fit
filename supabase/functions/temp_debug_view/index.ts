import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import postgres from "https://deno.land/x/postgresjs@v3.3.4/mod.js";

const sql = postgres('postgresql://postgres.vsgomemzzmffqkbxwsvd:Luxor%402025%21%21%21@aws-0-sa-east-1.pooler.supabase.com:6543/postgres');

serve(async (req) => {
  try {
    const data = await sql`
      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM admin_roles 
          -- Fix: Explicitly cast user_id to text to match Clerk's UUIDs and avoid postgres "invalid input syntax for type uuid" aborting the entire query
          WHERE user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) 
          AND role_type = 'admin' 
          AND is_active = true
        );
      $$;
    `;
    return new Response(JSON.stringify({ success: true }, null, 2), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }, null, 2), { status: 500 });
  }
});
