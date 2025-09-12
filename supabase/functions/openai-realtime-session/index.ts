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

    const { voice = 'alloy', instructions = 'You are a helpful, friendly voice assistant.', model = 'gpt-4o-mini-realtime-preview-2024-12-17' } = await req.json().catch(() => ({}));

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
            voice,
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