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
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { action, companionId, userId, sessionId, minutesUsed, apiType = 'voice', tokensUsed = 0, customCost } = await req.json();

    if (!userId || !companionId) {
      throw new Error("userId and companionId are required");
    }

    if (action === "start") {
      // Create new session record
      const { data, error } = await supabaseClient
        .from("conversation_usage")
        .insert({
          user_id: userId,
          companion_id: companionId,
          session_start: new Date().toISOString(),
          minutes_used: 0,
          api_type: apiType,
          tokens_used: tokensUsed,
          cost_override: customCost
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, sessionId: data.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "end") {
      if (!sessionId || minutesUsed === undefined) {
        throw new Error("sessionId and minutesUsed are required for end action");
      }

      // Update session record with end time and minutes used
      const updateData: any = {
        session_end: new Date().toISOString(),
        minutes_used: minutesUsed,
        tokens_used: tokensUsed
      };
      
      if (customCost !== undefined) {
        updateData.cost_override = customCost;
      }
      
      const { data, error } = await supabaseClient
        .from("conversation_usage")
        .update(updateData)
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;

      // Update trial usage if user is in trial
      const { data: subscriberData, error: subscriberError } = await supabaseClient
        .from("subscribers")
        .select("trial_minutes_used, subscribed")
        .eq("user_id", userId)
        .single();

      if (!subscriberError && !subscriberData?.subscribed) {
        // User is in trial, update trial minutes
        const newTrialMinutes = (subscriberData.trial_minutes_used || 0) + minutesUsed;
        
        const { error: updateError } = await supabaseClient
          .from("subscribers")
          .update({ trial_minutes_used: newTrialMinutes })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Trial update error:", updateError);
          // Don't throw - allow usage tracking to continue
        }
      }

      return new Response(
        JSON.stringify({ success: true, usage: data }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Legacy support for existing tracking calls
    if (action === "track" || !action) {
      const { companion_id, minutes_used } = await req.json();
      
      // Get user from auth header for legacy calls
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No authorization header provided");

      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      const user = userData.user;
      if (!user) throw new Error("User not authenticated");

      // Insert usage record for legacy tracking
      const insertData: any = {
        user_id: user.id,
        companion_id: companion_id || companionId,
        minutes_used: Math.ceil(minutes_used || minutesUsed || 1),
        session_start: new Date().toISOString(),
        session_end: new Date().toISOString(),
        api_type: apiType,
        tokens_used: tokensUsed
      };
      
      if (customCost !== undefined) {
        insertData.cost_override = customCost;
      }
      
      const { data, error } = await supabaseClient
        .from("conversation_usage")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Update trial usage
      const { data: subscriberData, error: subscriberError } = await supabaseClient
        .from("subscribers")
        .select("trial_minutes_used, subscribed")
        .eq("user_id", user.id)
        .single();

      if (!subscriberError && !subscriberData?.subscribed) {
        const newTrialMinutes = (subscriberData.trial_minutes_used || 0) + Math.ceil(minutes_used || minutesUsed || 1);
        
        await supabaseClient
          .from("subscribers")
          .update({ trial_minutes_used: newTrialMinutes })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ success: true, usage: data }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    throw new Error("Invalid action. Use 'start', 'end', or 'track'");

  } catch (error) {
    console.error("Error in track-usage:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});