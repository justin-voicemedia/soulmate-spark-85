import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (msg: string, data?: unknown) => console.log(`[invite-tester] ${msg}`, data ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Parse payload
    const { email } = await req.json().catch(() => ({ email: null }));
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    log("Inviting tester", { requestedBy: userData.user.id, email });

    // Try to preserve existing user_id if present for that email
    const { data: existingByEmail } = await supabase
      .from("subscribers")
      .select("user_id, trial_start, trial_minutes_used, trial_minutes_limit, is_tester")
      .eq("email", email)
      .maybeSingle();

    const nowIso = new Date().toISOString();

    const upsertPayload: Record<string, unknown> = {
      email,
      // keep existing user link if one exists
      user_id: existingByEmail?.user_id ?? null,
      is_tester: true,
      subscribed: false,
      subscription_tier: existingByEmail?.is_tester ? null : null,
      subscription_end: null,
      // keep existing trial info if present, otherwise start fresh generous limits
      trial_start: existingByEmail?.trial_start ?? nowIso,
      trial_minutes_used: existingByEmail?.trial_minutes_used ?? 0,
      trial_minutes_limit: existingByEmail?.trial_minutes_limit ?? 999999,
      updated_at: nowIso,
    };

    const { error: upsertErr } = await supabase
      .from("subscribers")
      .upsert(upsertPayload, { onConflict: "email" });

    if (upsertErr) {
      log("Upsert error", upsertErr);
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    log("Unexpected error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

