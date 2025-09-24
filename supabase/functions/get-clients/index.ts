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

    // Fetch pending tester invitations (subscribers with no user_id but is_tester=true)
    const { data: pendingTesters, error: pendingTestersError } = await admin
      .from("subscribers")
      .select("id, email, trial_start, trial_minutes_used, trial_minutes_limit, is_tester, created_at, updated_at")
      .is("user_id", null)
      .eq("is_tester", true)
      .order("created_at", { ascending: false });

    if (pendingTestersError) throw pendingTestersError;

    if (!profiles || profiles.length === 0) {
      // If no profiles but there are pending testers, return just the pending testers
      if (pendingTesters && pendingTesters.length > 0) {
        const pendingTesterClients = pendingTesters.map((tester) => ({
          id: `pending-${tester.id}`,
          email: tester.email,
          name: null,
          avatar_url: null,
          created_at: tester.created_at,
          updated_at: tester.updated_at,
          user_id: null,
          subscription: undefined,
          subscriber: {
            id: tester.id,
            subscribed: false,
            subscription_tier: null,
            trial_start: tester.trial_start,
            trial_minutes_used: tester.trial_minutes_used,
            trial_minutes_limit: tester.trial_minutes_limit,
            stripe_customer_id: null,
            is_tester: true,
            pending_invitation: true, // Mark as pending
          },
          usage_stats: { total_minutes: 0, total_sessions: 0, voice_minutes: 0, text_minutes: 0, voice_sessions: 0, text_sessions: 0 },
        }));
        return new Response(JSON.stringify({ clients: pendingTesterClients }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
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
        .select("user_id, minutes_used, session_start, session_end, api_type, tokens_used, created_at, companion_id")
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

    // Advanced filtering to remove duplicate and erroneous entries (same logic as get-usage-stats)
    const seenSessions = new Set();
    const filteredUsage = (usage || []).filter((u: any) => {
      const minutes = u.minutes_used || 0;
      if (minutes <= 0) return false; // Remove zero-minute sessions
      
      // Create a unique key for potential duplicates
      const sessionKey = `${u.user_id}_${u.companion_id}_${u.api_type}_${u.minutes_used}_${u.tokens_used}_${Math.floor(new Date(u.session_start || u.created_at).getTime() / 1000)}`;
      
      // Skip if we've seen this exact session before (within same second)
      if (seenSessions.has(sessionKey)) {
        console.log('Filtering duplicate session:', sessionKey);
        return false;
      }
      seenSessions.add(sessionKey);
      
      // Filter out suspicious zero-duration sessions with high minutes
      if (u.session_end && u.session_start) {
        const start = new Date(u.session_start).getTime();
        const end = new Date(u.session_end).getTime();
        const durationMs = Math.abs(end - start);
        
        // If session shows high minutes but zero duration, it's likely a bug
        if (durationMs < 1000 && minutes > 5) {
          console.log('Filtering zero-duration high-minute session:', { minutes, durationMs, sessionKey });
          return false;
        }
        
        // Drop if recorded as <= 1 minute but lasted < 15s (likely legacy 'track' spam)
        if (minutes <= 1 && durationMs < 15000) return false;
      }
      
      return true;
    });

    console.log('Usage filtering results:', {
      original: usage?.length || 0,
      filtered: filteredUsage.length,
      duplicatesRemoved: (usage?.length || 0) - filteredUsage.length
    });

    const usageAgg: Record<string, { 
      total_minutes: number; 
      total_sessions: number; 
      voice_minutes: number;
      text_minutes: number;
      voice_sessions: number;
      text_sessions: number;
      last_session?: string 
    }> = {};
    filteredUsage.forEach((u) => {
      const key = u.user_id as string;
      if (!usageAgg[key]) usageAgg[key] = { total_minutes: 0, total_sessions: 0, voice_minutes: 0, text_minutes: 0, voice_sessions: 0, text_sessions: 0, last_session: undefined };
      const minutes = (u.minutes_used || 0);
      const apiType = (u.api_type || 'voice');
      usageAgg[key].total_minutes += minutes;
      usageAgg[key].total_sessions += 1;
      if (apiType === 'voice') {
        usageAgg[key].voice_minutes += minutes;
        usageAgg[key].voice_sessions += 1;
      } else if (apiType === 'text') {
        usageAgg[key].text_minutes += minutes;
        usageAgg[key].text_sessions += 1;
      }
      if (!usageAgg[key].last_session || (u.session_start && u.session_start > usageAgg[key].last_session!)) {
        usageAgg[key].last_session = u.session_start;
      }
    });

    const clients = profiles.map((p) => {
      const sub = subsByUser[p.user_id];
      const subscriber = subscribersByUser[p.user_id];
      const usageStats = usageAgg[p.user_id] || { total_minutes: 0, total_sessions: 0, voice_minutes: 0, text_minutes: 0, voice_sessions: 0, text_sessions: 0, last_session: undefined };

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
              is_tester: subscriber.is_tester,
            }
          : undefined,
        usage_stats: usageStats,
      };
    });

    // Add pending tester invitations to the clients list
    const pendingTesterClients = (pendingTesters || []).map((tester) => ({
      id: `pending-${tester.id}`,
      email: tester.email,
      name: null,
      avatar_url: null,
      created_at: tester.created_at,
      updated_at: tester.updated_at,
      user_id: null,
      subscription: undefined,
      subscriber: {
        id: tester.id,
        subscribed: false,
        subscription_tier: null,
        trial_start: tester.trial_start,
        trial_minutes_used: tester.trial_minutes_used,
        trial_minutes_limit: tester.trial_minutes_limit,
        stripe_customer_id: null,
        is_tester: true,
        pending_invitation: true, // Mark as pending
      },
      usage_stats: { total_minutes: 0, total_sessions: 0, voice_minutes: 0, text_minutes: 0, voice_sessions: 0, text_sessions: 0 },
    }));

    // Combine regular clients with pending testers
    const allClients = [...clients, ...pendingTesterClients];

    return new Response(JSON.stringify({ clients: allClients }), {
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