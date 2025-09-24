import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PricingConfig {
  openai_text_input: number;    // per 1M tokens
  openai_text_output: number;   // per 1M tokens
  openai_voice_input: number;   // per minute
  openai_voice_output: number;  // per minute
  processing_overhead: number;  // flat rate per request
}

// Current pricing for OpenAI only (update these as needed)
const PRICING: PricingConfig = {
  openai_text_input: 0.15,      // $0.15 per 1M input tokens
  openai_text_output: 0.60,     // $0.60 per 1M output tokens  
  openai_voice_input: 0.006,    // $0.006 per minute
  openai_voice_output: 0.024,   // $0.024 per minute
  processing_overhead: 0.001,   // $0.001 per API call
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-COSTS] ${step}${detailsStr}`);
};

function calculateTokenCost(tokens: number, apiType: string, isInput: boolean = true): number {
  const tokensInMillions = tokens / 1_000_000;
  
  switch (apiType) {
    case 'text':
      return tokensInMillions * (isInput ? PRICING.openai_text_input : PRICING.openai_text_output);
    case 'voice':
      // For voice, we estimate token-to-minute conversion (rough: 150 tokens = 1 minute)
      const estimatedMinutes = tokens / 150;
      return estimatedMinutes * (isInput ? PRICING.openai_voice_input : PRICING.openai_voice_output);
    default:
      return 0;
  }
}

function calculateVoiceCost(minutes: number): number {
  const openaiCost = minutes * PRICING.openai_voice_output;
  return openaiCost + PRICING.processing_overhead;
}

function calculateTextCost(inputTokens: number, outputTokens: number): number {
  const inputCost = calculateTokenCost(inputTokens, 'text', true);
  const outputCost = calculateTokenCost(outputTokens, 'text', false);
  return inputCost + outputCost + PRICING.processing_overhead;
}

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
    logStep("Starting cost calculation");
    
    const body = await req.json();
    const { 
      user_id, 
      session_id, 
      api_type, 
      minutes_used = 0, 
      tokens_used = 0,
      input_tokens = 0,
      output_tokens = 0,
      characters_generated = 0,
      action = "calculate" // calculate, update_session, bulk_calculate
    } = body;

    if (action === "bulk_calculate") {
      // Recalculate costs for all sessions without proper cost data
      logStep("Starting bulk cost recalculation");
      
      const { data: sessions, error: sessionsError } = await supabaseClient
        .from("conversation_usage")
        .select("*")
        .is("cost_override", null);

      if (sessionsError) throw sessionsError;

      let updatedCount = 0;
      
      for (const session of sessions || []) {
        let calculatedCost = 0;

        if (session.api_type === 'voice') {
          calculatedCost = calculateVoiceCost(session.minutes_used || 0);
        } else if (session.api_type === 'text') {
          // Estimate input/output tokens if not available
          const totalTokens = session.tokens_used || 0;
          const estimatedInput = Math.floor(totalTokens * 0.7); // Assume 70% input
          const estimatedOutput = totalTokens - estimatedInput;
          
          calculatedCost = calculateTextCost(estimatedInput, estimatedOutput);
        }

        if (calculatedCost > 0) {
          const { error: updateError } = await supabaseClient
            .from("conversation_usage")
            .update({ 
              calculated_cost_cents: Math.round(calculatedCost * 100),
              updated_at: new Date().toISOString()
            })
            .eq("id", session.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        updated_sessions: updatedCount,
        message: `Updated cost calculations for ${updatedCount} sessions`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "update_session" && session_id) {
      // Update specific session with cost calculation
      let calculatedCost = 0;

      if (api_type === 'voice') {
        calculatedCost = calculateVoiceCost(minutes_used);
      } else if (api_type === 'text') {
        calculatedCost = calculateTextCost(input_tokens || 0, output_tokens || 0);
      }

      const costCents = Math.round(calculatedCost * 100);

      const { error: updateError } = await supabaseClient
        .from("conversation_usage")
        .update({ 
          calculated_cost_cents: costCents,
          input_tokens: input_tokens || 0,
          output_tokens: output_tokens || 0,
          characters_generated: characters_generated || 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", session_id);

      if (updateError) throw updateError;

      // Update daily analytics
      const today = new Date().toISOString().split('T')[0];
      const { error: analyticsError } = await supabaseClient
        .from("usage_analytics")
        .upsert({
          user_id,
          date: today,
          total_cost_cents: costCents,
          api_calls_made: 1,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        });

      if (analyticsError) {
        logStep("Error updating analytics", { error: analyticsError });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        calculated_cost: calculatedCost,
        cost_cents: costCents
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Default: just calculate and return cost
    let calculatedCost = 0;

    if (api_type === 'voice') {
      calculatedCost = calculateVoiceCost(minutes_used);
    } else if (api_type === 'text') {
      calculatedCost = calculateTextCost(input_tokens || 0, output_tokens || 0);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      calculated_cost: calculatedCost,
      cost_cents: Math.round(calculatedCost * 100),
      pricing_breakdown: {
        api_type,
        minutes_used,
        tokens_used,
        input_tokens,
        output_tokens,
        characters_generated,
        pricing_config: PRICING
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in calculate-usage-costs", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});