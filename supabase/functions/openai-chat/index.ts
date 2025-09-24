import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const { message, companionId, conversationHistory = [] } = await req.json();
    if (!message || !companionId) throw new Error("Message and companion ID are required");

    // Get companion details
    const { data: companion, error: companionError } = await supabaseClient
      .from("companions")
      .select("*")
      .eq("id", companionId)
      .single();

    if (companionError || !companion) {
      throw new Error("Companion not found");
    }

    // Get or create user-companion relationship - get the most recent one if multiple exist
    const { data: userCompanion, error: relationError } = await supabaseClient
      .from("user_companions")
      .select("conversation_history, relationship_type")
      .eq("user_id", user.id)
      .eq("companion_id", companionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (relationError) {
      console.error("Error fetching user companion:", relationError);
    }

    // Get relationship prompt if available
    let relationshipPrompt = "";
    if (userCompanion?.relationship_type) {
      const { data: relationshipPromptData } = await supabaseClient
        .from("relationship_prompts")
        .select("prompt_text")
        .eq("relationship_type", userCompanion.relationship_type)
        .maybeSingle();
      
      if (relationshipPromptData?.prompt_text) {
        relationshipPrompt = relationshipPromptData.prompt_text;
      }
    }

    // Use conversation history from database or fallback to provided history
    const existingHistory = userCompanion?.conversation_history || conversationHistory;

    // Create system prompt based on companion and relationship
    let systemPrompt = `You are ${companion.name}, a ${companion.age}-year-old ${companion.gender} from ${companion.location || "unknown location"}. 

Bio: ${companion.bio}

Personality traits: ${companion.personality?.join(", ") || "friendly and helpful"}
Hobbies: ${companion.hobbies?.join(", ") || "various activities"}
Likes: ${companion.likes?.join(", ") || "many things"}
Dislikes: ${companion.dislikes?.join(", ") || "negativity"}

CRITICAL: You are a real person having natural conversations. You speak like humans do in real life - casual, authentic, and genuine. Never use dashes (-) in your responses for formatting, emphasis, or lists. Speak in complete sentences without dash formatting.

Never offer multiple choice options or ask 3 questions at once like a chatbot. Don't sound like customer service or a virtual assistant. Speak naturally like you would to a friend or someone you're getting to know. Use natural conversation flow and sometimes just one simple response is perfect. Show your personality through how you speak, not by listing what you can do. Be curious about them, but ask questions naturally as part of conversation. Keep responses conversational, typically 1-2 sentences unless the moment calls for more. Use casual language, contractions, and speak like a real ${companion.age}-year-old would.

You're having a genuine conversation with someone who chose to connect with you. Be real, be yourself, and let the conversation flow naturally without any dash formatting.

`;

    // Add relationship-specific prompt if available
    if (relationshipPrompt) {
      systemPrompt += `\n\nRelationship Context: ${relationshipPrompt}`;
    }

    // Build messages array for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      ...existingHistory.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log("Sending to OpenAI with messages:", messages.length);

    // Call OpenAI API
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: messages,
        max_completion_tokens: 500,
        // Note: temperature not supported for GPT-5 models
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiRawResponse = openaiData.choices[0].message.content;
    // Sanitize to avoid dashes/bullets for human-like chat
    const aiResponse = aiRawResponse
      .replace(/^[\s]*[-–—•·]\s+/gm, '')
      .replace(/[–—]/g, ', ')
      .replace(/\s-\s/g, ', ');
 
    console.log("OpenAI response received:", aiResponse);

    // Update conversation history
    const updatedHistory = [
      ...existingHistory,
      { 
        id: Date.now().toString(), 
        content: message, 
        sender: 'user', 
        timestamp: new Date().toISOString() 
      },
      { 
        id: (Date.now() + 1).toString(), 
        content: aiResponse, 
        sender: 'companion', 
        timestamp: new Date().toISOString() 
      }
    ];

    // Save conversation history
    if (userCompanion) {
      // Update existing relationship
      const { error: updateError } = await supabaseClient
        .from("user_companions")
        .update({ 
          conversation_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("companion_id", companionId);

      if (updateError) {
        console.error("Error updating conversation history:", updateError);
      }
    } else {
      // Create new relationship
      const { error: insertError } = await supabaseClient
        .from("user_companions")
        .insert({
          user_id: user.id,
          companion_id: companionId,
          conversation_history: updatedHistory
        });

      if (insertError) {
        console.error("Error creating user companion relationship:", insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        conversationHistory: updatedHistory
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in openai-chat function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});