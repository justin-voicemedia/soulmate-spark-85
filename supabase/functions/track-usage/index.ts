import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { companion_id, minutes_used, session_id } = body;
    
    if (!companion_id || minutes_used === undefined) {
      throw new Error("companion_id and minutes_used are required");
    }

    logStep("Tracking usage", { companion_id, minutes_used, session_id });

    // Insert usage record
    const { error: usageError } = await supabaseClient
      .from("conversation_usage")
      .upsert({
        id: session_id || undefined,
        user_id: user.id,
        companion_id: companion_id,
        minutes_used: Math.ceil(minutes_used), // Round up to nearest minute
        session_end: new Date().toISOString(),
      });

    if (usageError) {
      logStep("Error inserting usage record", { error: usageError });
      throw new Error(`Failed to track usage: ${usageError.message}`);
    }

    // Update subscriber's total trial minutes used
    const { data: totalUsage } = await supabaseClient
      .from("conversation_usage")
      .select("minutes_used")
      .eq("user_id", user.id);

    const totalMinutesUsed = totalUsage?.reduce((sum, record) => sum + record.minutes_used, 0) || 0;

    const { error: subscriberError } = await supabaseClient
      .from("subscribers")
      .update({ 
        trial_minutes_used: totalMinutesUsed,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (subscriberError) {
      logStep("Error updating subscriber", { error: subscriberError });
    }

    logStep("Usage tracked successfully", { totalMinutesUsed });

    return new Response(JSON.stringify({ 
      success: true,
      total_minutes_used: totalMinutesUsed
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in track-usage", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});