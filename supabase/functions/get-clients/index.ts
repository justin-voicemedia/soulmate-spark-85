import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, email, name, avatar_url, created_at, updated_at, user_id")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ clients: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const userIds = profiles.map((p) => p.user_id).filter(Boolean);

    // Batch load related data
    const [{ data: subs }, { data: subscribers }, { data: usage }] = await Promise.all([
      admin.from("subscriptions").select("*\n").in("user_id", userIds),
      admin.from("subscribers").select("*\n").in("user_id", userIds),
      admin
        .from("conversation_usage")
        .select("user_id, minutes_used, session_start")
        .in("user_id", userIds),
    ]);

    // Index by user_id
    const subsByUser: Record<string, any> = {};
    (subs || []).forEach((s) => {
      if (!subsByUser[s.user_id]) subsByUser[s.user_id] = s;
    });

    const subscribersByUser: Record<string, any> = {};
    (subscribers || []).forEach((s) => {
      if (!subscribersByUser[s.user_id]) subscribersByUser[s.user_id] = s;
    });

    const usageAgg: Record<string, { total_minutes: number; total_sessions: number; last_session?: string }> = {};
    (usage || []).forEach((u) => {
      const key = u.user_id as string;
      if (!usageAgg[key]) usageAgg[key] = { total_minutes: 0, total_sessions: 0, last_session: undefined };
      usageAgg[key].total_minutes += u.minutes_used || 0;
      usageAgg[key].total_sessions += 1;
      if (!usageAgg[key].last_session || (u.session_start && u.session_start > usageAgg[key].last_session!)) {
        usageAgg[key].last_session = u.session_start;
      }
    });

    const clients = profiles.map((p) => {
      const sub = subsByUser[p.user_id];
      const subscriber = subscribersByUser[p.user_id];
      const usageStats = usageAgg[p.user_id] || { total_minutes: 0, total_sessions: 0, last_session: undefined };

      return {
        id: p.id,
        email: p.email,
        name: p.name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        updated_at: p.updated_at,
        user_id: p.user_id,
        subscription: sub
          ? {
              id: sub.id,
              status: sub.status,
              plan_type: sub.plan_type,
              current_period_start: sub.current_period_start,
              current_period_end: sub.current_period_end,
              stripe_customer_id: sub.stripe_customer_id,
              spicy_unlocked: sub.spicy_unlocked,
            }
          : undefined,
        subscriber: subscriber
          ? {
              id: subscriber.id,
              subscribed: subscriber.subscribed,
              subscription_tier: subscriber.subscription_tier,
              trial_start: subscriber.trial_start,
              trial_minutes_used: subscriber.trial_minutes_used,
              trial_minutes_limit: subscriber.trial_minutes_limit,
              stripe_customer_id: subscriber.stripe_customer_id,
            }
          : undefined,
        usage_stats: usageStats,
      };
    });

    return new Response(JSON.stringify({ clients }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-clients:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});