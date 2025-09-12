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

    // Helper function to calculate cost based on API type
    const calculateCost = (session: any) => {
      if (session.cost_override !== null) return Number(session.cost_override);
      
      const apiType = session.api_type || 'voice';
      const tokensUsed = session.tokens_used || 0;
      
      if (apiType === 'voice') {
        // If no tokens recorded, estimate from minutes using speech formula
        const effectiveTokens = tokensUsed || (session.minutes_used * 372); // 372 tokens/minute estimate
        // OpenAI Realtime API: $32/million input tokens + $64/million output tokens
        // Assuming roughly 50/50 split for conversational AI
        const avgCostPerMillionTokens = (32 + 64) / 2; // $48 per million tokens average
        return (effectiveTokens / 1000000) * avgCostPerMillionTokens;
      } else if (apiType === 'text') {
        return (tokensUsed / 1000000) * 2.50; // GPT-5-mini cost per million tokens
      }
      return 0;
    };

    // Calculate usage statistics
    const totalMinutes = usageData.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const totalCost = usageData.reduce((sum, session) => sum + calculateCost(session), 0);
    const sessionsCount = usageData.length;
    const avgSessionLength = sessionsCount > 0 ? totalMinutes / sessionsCount : 0;
    
    // Calculate breakdown by API type
    const voiceSessions = usageData.filter(s => (s.api_type || 'voice') === 'voice');
    const textSessions = usageData.filter(s => s.api_type === 'text');
    
    const voiceMinutes = voiceSessions.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    const voiceCost = voiceSessions.reduce((sum, s) => sum + calculateCost(s), 0);
    const voiceTokens = voiceSessions.reduce((sum, s) => {
      const tokens = s.tokens_used || (s.minutes_used * 372); // Estimate if not recorded
      return sum + tokens;
    }, 0);
    const textMinutes = textSessions.reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    const textCost = textSessions.reduce((sum, s) => sum + calculateCost(s), 0);
    const textTokens = textSessions.reduce((sum, s) => sum + (s.tokens_used || 0), 0);

    // Today's usage
    const todayUsage = usageData.filter(session => 
      session.session_start.startsWith(today)
    );
    const todayMinutes = todayUsage.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const todayCost = todayUsage.reduce((sum, session) => sum + calculateCost(session), 0);
    const todayVoiceMinutes = todayUsage.filter(s => (s.api_type || 'voice') === 'voice').reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    const todayTextMinutes = todayUsage.filter(s => s.api_type === 'text').reduce((sum, s) => sum + (s.minutes_used || 0), 0);

    // This month's usage
    const monthUsage = usageData.filter(session => 
      session.session_start >= monthStart
    );
    const thisMonthMinutes = monthUsage.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const thisMonthCost = monthUsage.reduce((sum, session) => sum + calculateCost(session), 0);
    const monthVoiceMinutes = monthUsage.filter(s => (s.api_type || 'voice') === 'voice').reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    const monthTextMinutes = monthUsage.filter(s => s.api_type === 'text').reduce((sum, s) => sum + (s.minutes_used || 0), 0);

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
          cost: calculateCost(session)
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
        companionBreakdown,
        // API type breakdown
        voiceStats: {
          minutes: voiceMinutes,
          cost: voiceCost,
          sessions: voiceSessions.length,
          totalTokens: voiceTokens
        },
        textStats: {
          minutes: textMinutes,
          cost: textCost,
          sessions: textSessions.length,
          totalTokens: textTokens
        },
        // Daily breakdown by API type
        todayStats: {
          voice: { minutes: todayVoiceMinutes },
          text: { minutes: todayTextMinutes }
        },
        monthStats: {
          voice: { minutes: monthVoiceMinutes },
          text: { minutes: monthTextMinutes }
        }
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