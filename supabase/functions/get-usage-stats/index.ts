import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Get current date info
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch usage data
    const { data: usageData, error: usageError } = await supabaseClient
      .from('conversation_usage')
      .select(`
        *,
        companions(name)
      `)
      .eq('user_id', userId);

    if (usageError) throw usageError;

    // Fetch subscriber info for trial status
    const { data: subscriberData, error: subscriberError } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subscriberError && subscriberError.code !== 'PGRST116') {
      throw subscriberError;
    }

    // Calculate usage statistics
    const totalMinutes = usageData.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const totalCost = totalMinutes * 0.10;
    const sessionsCount = usageData.length;
    const avgSessionLength = sessionsCount > 0 ? totalMinutes / sessionsCount : 0;

    // Today's usage
    const todayUsage = usageData.filter(session => 
      session.session_start.startsWith(today)
    );
    const todayMinutes = todayUsage.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const todayCost = todayMinutes * 0.10;

    // This month's usage
    const monthUsage = usageData.filter(session => 
      session.session_start >= monthStart
    );
    const thisMonthMinutes = monthUsage.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const thisMonthCost = thisMonthMinutes * 0.10;

    // Companion breakdown
    const companionMap = new Map();
    usageData.forEach(session => {
      const companionName = session.companions?.name || 'Unknown Companion';
      const minutes = session.minutes_used || 0;
      
      if (companionMap.has(companionName)) {
        companionMap.set(companionName, {
          ...companionMap.get(companionName),
          minutes: companionMap.get(companionName).minutes + minutes
        });
      } else {
        companionMap.set(companionName, {
          companionName,
          minutes,
          cost: minutes * 0.10
        });
      }
    });

    const companionBreakdown = Array.from(companionMap.values())
      .sort((a, b) => b.minutes - a.minutes);

    // Trial information
    const isTrialUser = !subscriberData?.subscribed || false;
    const trialStart = subscriberData?.trial_start ? new Date(subscriberData.trial_start) : new Date();
    const trialEnd = new Date(trialStart.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    const trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    const trialMinutesUsed = subscriberData?.trial_minutes_used || 0;
    const trialMinutesLimit = subscriberData?.trial_minutes_limit || 500;

    const response = {
      usage: {
        totalMinutes,
        totalCost,
        sessionsCount,
        avgSessionLength,
        todayMinutes,
        todayCost,
        thisMonthMinutes,
        thisMonthCost,
        companionBreakdown
      },
      trial: {
        isTrialUser,
        trialMinutesUsed,
        trialMinutesLimit,
        trialDaysRemaining
      }
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in get-usage-stats:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});