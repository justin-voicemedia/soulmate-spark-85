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

    // Fetch usage data (no join; fetch companion names separately)
    const { data: usageData, error: usageError } = await supabaseClient
      .from('conversation_usage')
      .select('*')
      .eq('user_id', userId);

    if (usageError) throw usageError;

    // Advanced filtering to remove duplicate and erroneous entries
    const seenSessions = new Set();
    const filteredUsageData = (usageData || []).filter((s: any) => {
      const minutes = s.minutes_used || 0;
      if (minutes <= 0) return false; // Remove zero-minute sessions
      
      // Create a unique key for potential duplicates
      const sessionKey = `${s.user_id}_${s.companion_id}_${s.api_type}_${s.minutes_used}_${s.tokens_used}_${Math.floor(new Date(s.created_at).getTime() / 1000)}`;
      
      // Skip if we've seen this exact session before (within same second)
      if (seenSessions.has(sessionKey)) {
        console.log('Filtering duplicate session:', sessionKey);
        return false;
      }
      seenSessions.add(sessionKey);
      
      // Filter out suspicious zero-duration sessions with high minutes
      if (s.session_end && s.session_start) {
        const start = new Date(s.session_start).getTime();
        const end = new Date(s.session_end).getTime();
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

    console.log('Usage data retrieved:', {
      total: usageData?.length || 0,
      filtered: filteredUsageData.length,
      sample: filteredUsageData.slice(0, 3),
    });

    // Build companion name map (no DB joins required)
    const companionIds = Array.from(
      new Set((filteredUsageData || []).map((s: any) => s.companion_id).filter((id: any) => !!id))
    );
    const companionNamesById = new Map<string, string>();
    if (companionIds.length > 0) {
      const { data: companionsData, error: companionsError } = await supabaseClient
        .from('companions')
        .select('id,name')
        .in('id', companionIds);
      if (companionsError) {
        console.error('Failed to load companion names', companionsError);
      } else {
        companionsData?.forEach((c: any) => companionNamesById.set(c.id, c.name));
        console.log('Companion names loaded:', Object.fromEntries(companionNamesById));
      }
    }

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
        // OpenAI gpt-4o-realtime-preview: $32/million input tokens + $64/million output tokens
        // Assuming roughly 50/50 split for conversational AI
        const avgCostPerMillionTokens = (32 + 64) / 2; // $48 per million tokens average
        return (effectiveTokens / 1000000) * avgCostPerMillionTokens;
      } else if (apiType === 'text') {
        return (tokensUsed / 1000000) * 2.50; // GPT-5-mini cost per million tokens
      }
      return 0;
    };

    // Calculate usage statistics
    const totalMinutes = filteredUsageData.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const totalCost = filteredUsageData.reduce((sum, session) => sum + calculateCost(session), 0);
    const sessionsCount = filteredUsageData.length;
    const avgSessionLength = sessionsCount > 0 ? totalMinutes / sessionsCount : 0;
    
    // Calculate breakdown by API type
    const voiceSessions = filteredUsageData.filter(s => (s.api_type || 'voice') === 'voice');
    const textSessions = filteredUsageData.filter(s => s.api_type === 'text');
    
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
    const todayUsage = filteredUsageData.filter(session => 
      session.session_start.startsWith(today)
    );
    const todayMinutes = todayUsage.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const todayCost = todayUsage.reduce((sum, session) => sum + calculateCost(session), 0);
    const todayVoiceMinutes = todayUsage.filter(s => (s.api_type || 'voice') === 'voice').reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    const todayTextMinutes = todayUsage.filter(s => s.api_type === 'text').reduce((sum, s) => sum + (s.minutes_used || 0), 0);

    // This month's usage
    const monthUsage = filteredUsageData.filter(session => 
      session.session_start >= monthStart
    );
    const thisMonthMinutes = monthUsage.reduce((sum, session) => sum + (session.minutes_used || 0), 0);
    const thisMonthCost = monthUsage.reduce((sum, session) => sum + calculateCost(session), 0);
    const monthVoiceMinutes = monthUsage.filter(s => (s.api_type || 'voice') === 'voice').reduce((sum, s) => sum + (s.minutes_used || 0), 0);
    const monthTextMinutes = monthUsage.filter(s => s.api_type === 'text').reduce((sum, s) => sum + (s.minutes_used || 0), 0);

    // Companion breakdown - based on filtered data (deduplicated)
    const companionMap = new Map();
    filteredUsageData.forEach(session => {
      const companionName = companionNamesById.get(session.companion_id) || `Companion ${session.companion_id?.slice(0, 8)}`;
      const minutes = session.minutes_used || 0;
      const cost = calculateCost(session);
      
      if (companionMap.has(companionName)) {
        const existing = companionMap.get(companionName);
        companionMap.set(companionName, {
          companionName,
          minutes: existing.minutes + minutes,
          cost: existing.cost + cost
        });
      } else {
        companionMap.set(companionName, {
          companionName,
          minutes,
          cost
        });
      }
    });

    const companionBreakdown = Array.from(companionMap.values())
      .filter(companion => companion.minutes > 0)
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