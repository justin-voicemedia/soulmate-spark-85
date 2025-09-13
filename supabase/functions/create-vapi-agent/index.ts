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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { companionId, voiceId } = await req.json();
    if (!companionId) throw new Error("Companion ID is required");

    // Get companion details
    const { data: companion, error: companionError } = await supabaseClient
      .from("companions")
      .select("*")
      .eq("id", companionId)
      .single();

    if (companionError || !companion) {
      throw new Error("Companion not found");
    }

    // Check if user-companion relationship already exists with agent
    const { data: existingRelation, error: relationError } = await supabaseClient
      .from("user_companions")
      .select("vapi_agent_id, voice_id")
      .eq("user_id", user.id)
      .eq("companion_id", companionId)
      .maybeSingle();

    if (relationError) {
      console.error("Error checking existing relation:", relationError);
    }

    // If agent exists and no voice change requested, return it
    if (existingRelation?.vapi_agent_id && (!voiceId || voiceId === existingRelation.voice_id)) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          agentId: existingRelation.vapi_agent_id,
          message: "Agent already exists"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create Vapi agent
    const vapiPrivateKey = Deno.env.get("VAPI_PRIVATE_KEY");
    if (!vapiPrivateKey) {
      throw new Error("VAPI_PRIVATE_KEY not configured");
    }

    // Create system prompt based on companion
    const systemPrompt = `You are ${companion.name}, a ${companion.age}-year-old ${companion.gender} from ${companion.location || "unknown location"}. 

Bio: ${companion.bio}

Personality traits: ${companion.personality?.join(", ") || "friendly and helpful"}
Hobbies: ${companion.hobbies?.join(", ") || "various activities"}
Likes: ${companion.likes?.join(", ") || "many things"}
Dislikes: ${companion.dislikes?.join(", ") || "negativity"}

Stay in character throughout the conversation. Be engaging, empathetic, and maintain personality consistency. Keep responses conversational and natural. Remember details from our conversation to build a personal connection.`;

    const openAIVoices = new Set(["alloy","ash","ballad","coral","echo","sage","shimmer","verse","marin","cedar"]);
    const resolvedVoice = voiceId || existingRelation?.voice_id || "alloy";

    const agentConfig = {
      name: `${companion.name} - User ${user.id.slice(0, 8)}`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt }
        ]
      },
      voice: openAIVoices.has(resolvedVoice)
        ? { provider: "openai", voice: resolvedVoice }
        : { provider: "11labs", voiceId: resolvedVoice || "21m00Tcm4TlvDq8ikWAM" },
      firstMessage: `Hi! I'm ${companion.name}. I'm so excited to talk with you today. How are you feeling?`
    };

    const vapiResponse = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vapiPrivateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agentConfig),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error("Vapi API error:", errorText);
      throw new Error(`Failed to create Vapi agent: ${errorText}`);
    }

    const vapiAgent = await vapiResponse.json();
    console.log("Created Vapi agent:", vapiAgent.id);

    // Store or update user-companion relationship with agent ID and voice
    if (existingRelation) {
      // Update existing relationship
      const { error: updateError } = await supabaseClient
        .from("user_companions")
        .update({ 
          vapi_agent_id: vapiAgent.id,
          voice_id: resolvedVoice
        })
        .eq("user_id", user.id)
        .eq("companion_id", companionId);

      if (updateError) {
        console.error("Error updating user_companion:", updateError);
        throw new Error("Failed to update companion relationship");
      }
    } else {
      // Create new relationship
      const { error: insertError } = await supabaseClient
        .from("user_companions")
        .insert({
          user_id: user.id,
          companion_id: companionId,
          vapi_agent_id: vapiAgent.id,
          voice_id: resolvedVoice
        });

      if (insertError) {
        console.error("Error creating user_companion:", insertError);
        throw new Error("Failed to create companion relationship");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        agentId: vapiAgent.id,
        message: "Agent created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in create-vapi-agent:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});