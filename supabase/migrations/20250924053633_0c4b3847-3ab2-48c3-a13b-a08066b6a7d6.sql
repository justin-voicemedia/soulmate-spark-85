-- Fix security definer view issue
-- Drop and recreate the user_cost_analytics view without SECURITY DEFINER

DROP VIEW IF EXISTS public.user_cost_analytics;

CREATE VIEW public.user_cost_analytics AS
SELECT 
  s.user_id,
  s.email,
  s.subscribed,
  s.subscription_tier,
  s.is_tester,
  s.total_lifetime_value_cents,
  s.trial_minutes_used,
  s.trial_minutes_limit,
  s.customer_since,
  s.last_login,
  
  -- Current month usage and costs
  COALESCE(monthly.current_month_minutes, 0) as current_month_minutes,
  COALESCE(monthly.current_month_sessions, 0) as current_month_sessions,
  COALESCE(monthly.current_month_cost_cents, 0) as current_month_cost_cents,
  COALESCE(monthly.current_month_voice_cost_cents, 0) as current_month_voice_cost_cents,
  COALESCE(monthly.current_month_text_cost_cents, 0) as current_month_text_cost_cents,
  
  -- Lifetime usage and costs
  COALESCE(lifetime.lifetime_minutes, 0) as lifetime_minutes,
  COALESCE(lifetime.lifetime_sessions, 0) as lifetime_sessions,
  COALESCE(lifetime.lifetime_cost_cents, 0) as lifetime_cost_cents,
  
  -- Average costs
  CASE 
    WHEN COALESCE(lifetime.lifetime_sessions, 0) > 0 
    THEN COALESCE(lifetime.lifetime_cost_cents, 0) / lifetime.lifetime_sessions
    ELSE 0 
  END as avg_cost_per_session_cents,
  
  CASE 
    WHEN COALESCE(lifetime.lifetime_minutes, 0) > 0 
    THEN COALESCE(lifetime.lifetime_cost_cents, 0) / lifetime.lifetime_minutes
    ELSE 0 
  END as avg_cost_per_minute_cents,
  
  -- Profit calculation (revenue - costs)
  CASE 
    WHEN s.subscribed AND s.subscription_tier = 'Basic' THEN 1999 - COALESCE(monthly.current_month_cost_cents, 0)
    WHEN s.subscribed AND s.subscription_tier = 'Premium' THEN 3999 - COALESCE(monthly.current_month_cost_cents, 0)
    ELSE 0 - COALESCE(monthly.current_month_cost_cents, 0)
  END as current_month_profit_cents

FROM public.subscribers s

-- Current month aggregations
LEFT JOIN (
  SELECT 
    cu.user_id,
    SUM(cu.minutes_used) as current_month_minutes,
    COUNT(*) as current_month_sessions,
    SUM(cu.calculated_cost_cents) as current_month_cost_cents,
    SUM(CASE WHEN cu.api_type = 'voice' THEN cu.calculated_cost_cents ELSE 0 END) as current_month_voice_cost_cents,
    SUM(CASE WHEN cu.api_type = 'text' THEN cu.calculated_cost_cents ELSE 0 END) as current_month_text_cost_cents
  FROM public.conversation_usage cu
  WHERE cu.session_start >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY cu.user_id
) monthly ON s.user_id = monthly.user_id

-- Lifetime aggregations
LEFT JOIN (
  SELECT 
    cu.user_id,
    SUM(cu.minutes_used) as lifetime_minutes,
    COUNT(*) as lifetime_sessions,
    SUM(cu.calculated_cost_cents) as lifetime_cost_cents
  FROM public.conversation_usage cu
  GROUP BY cu.user_id
) lifetime ON s.user_id = lifetime.user_id;