import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const body = await req.json().catch(() => ({}));
    const { action, voice = 'alloy', instructions = 'You are a helpful, friendly companion who speaks naturally like a real person. Be genuine, casual, and conversational - never sound like a chatbot or virtual assistant. Keep responses natural and flowing, like talking to a friend.', model = 'gpt-4o-mini-realtime-preview-2024-12-17', sdp, ephemeralKey } = body;

    // Handle SDP exchange (WebRTC connection setup)
    if (action === 'exchange_sdp') {
      if (!sdp || !ephemeralKey) {
        throw new Error('Missing sdp or ephemeralKey for SDP exchange');
      }

      console.log('Exchanging SDP with OpenAI...');
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: sdp,
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('OpenAI SDP exchange failed:', sdpResponse.status, errorText);
        throw new Error(`OpenAI SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      return new Response(JSON.stringify({ sdp: answerSdp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle session creation (ephemeral token)
    // Validate voice against OpenAI supported list
    const allowedVoices = new Set(['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar']);
    const voiceToUse = allowedVoices.has(voice) ? voice : 'alloy';

    console.log(`Creating realtime session with model: ${model}, voice: ${voice}`);
    console.log(`Instructions length: ${instructions.length} chars`);

    // Try primary model first, fallback to standard if needed
    const modelsToTry = [
      model,
      'gpt-4o-mini-realtime-preview-2024-12-17',
      'gpt-4o-realtime-preview-2024-12-17'
    ];

    let lastError = null;
    for (const attemptModel of modelsToTry) {
      try {
        console.log(`Attempting with model: ${attemptModel}`);
        
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: attemptModel,
            voice: voiceToUse,
            instructions,
          }),
        });

        console.log(`Response status: ${response.status} for model: ${attemptModel}`);

        if (response.ok) {
          const data = await response.json();
          console.log("Session created successfully", data?.id ?? 'no-id');
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const text = await response.text();
          console.error(`Failed with model ${attemptModel}:`, text);
          lastError = text;
          continue; // Try next model
        }
      } catch (error) {
        console.error(`Error with model ${attemptModel}:`, error);
        lastError = error.message;
        continue; // Try next model
      }
    }

    // If we get here, all models failed
    throw new Error(`All models failed. Last error: ${lastError}`);
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return new Response(JSON.stringify({ error: error.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});