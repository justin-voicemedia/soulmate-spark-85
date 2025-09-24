import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, creating subscriber with trial");
      // Create subscriber record with trial for new users
      const trialStart = new Date().toISOString();
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        trial_start: trialStart,
        trial_minutes_used: 0,
        trial_minutes_limit: 500,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        trial_active: true,
        trial_start: trialStart,
        trial_minutes_used: 0,
        trial_minutes_limit: 500,
        is_tester: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      if (amount <= 1999) {
        subscriptionTier = "Basic";
      } else {
        subscriptionTier = "Premium";
      }
      logStep("Determined subscription tier", { priceId, amount, subscriptionTier });
    } else {
      logStep("No active subscription found");
    }

    // Get existing subscriber data to preserve trial info and check tester status
    const { data: existingSubscriber } = await supabaseClient
      .from("subscribers")
      .select("trial_start, trial_minutes_used, trial_minutes_limit, is_tester")
      .eq("user_id", user.id)
      .single();
    
    logStep("Existing subscriber data", { existingSubscriber });

    // Calculate trial status
    let trialActive = false;
    let trialExpired = false;
    const trialStart = existingSubscriber?.trial_start;
    const trialMinutesUsed = existingSubscriber?.trial_minutes_used || 0;
    const trialMinutesLimit = existingSubscriber?.trial_minutes_limit || 500;
    
    if (trialStart && !hasActiveSub) {
      const trialStartDate = new Date(trialStart);
      const now = new Date();
      const daysSinceTrialStart = (now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceTrialStart <= 7 && trialMinutesUsed < trialMinutesLimit) {
        trialActive = true;
      } else {
        trialExpired = true;
      }
    }
    
    logStep("Trial status calculated", { 
      trialActive, 
      trialExpired, 
      trialMinutesUsed, 
      trialMinutesLimit 
    });

    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      trial_start: existingSubscriber?.trial_start || null,
      trial_minutes_used: trialMinutesUsed,
      trial_minutes_limit: trialMinutesLimit,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Updated database with subscription info", { 
      subscribed: hasActiveSub, 
      subscriptionTier,
      trialActive,
      trialExpired
    });
    
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      trial_active: trialActive,
      trial_expired: trialExpired,
      trial_start: trialStart,
      trial_minutes_used: trialMinutesUsed,
      trial_minutes_limit: trialMinutesLimit,
      is_tester: existingSubscriber?.is_tester || false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});