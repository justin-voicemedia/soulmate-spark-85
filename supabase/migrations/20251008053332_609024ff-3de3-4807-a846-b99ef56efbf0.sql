-- Fix security definer view issue by converting user_cost_analytics to SECURITY INVOKER
-- This ensures the view respects RLS policies of the querying user, not the view creator

-- Drop and recreate the view with security_invoker=on
DROP VIEW IF EXISTS public.user_cost_analytics;

CREATE VIEW public.user_cost_analytics 
WITH (security_invoker=on)
AS
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
  COALESCE(monthly.current_month_minutes, 0::bigint) AS current_month_minutes,
  COALESCE(monthly.current_month_sessions, 0::bigint) AS current_month_sessions,
  COALESCE(monthly.current_month_cost_cents, 0::bigint) AS current_month_cost_cents,
  COALESCE(monthly.current_month_voice_cost_cents, 0::bigint) AS current_month_voice_cost_cents,
  COALESCE(monthly.current_month_text_cost_cents, 0::bigint) AS current_month_text_cost_cents,
  COALESCE(lifetime.lifetime_minutes, 0::bigint) AS lifetime_minutes,
  COALESCE(lifetime.lifetime_sessions, 0::bigint) AS lifetime_sessions,
  COALESCE(lifetime.lifetime_cost_cents, 0::bigint) AS lifetime_cost_cents,
  CASE
    WHEN COALESCE(lifetime.lifetime_sessions, 0::bigint) > 0 
    THEN COALESCE(lifetime.lifetime_cost_cents, 0::bigint) / lifetime.lifetime_sessions
    ELSE 0::bigint
  END AS avg_cost_per_session_cents,
  CASE
    WHEN COALESCE(lifetime.lifetime_minutes, 0::bigint) > 0 
    THEN COALESCE(lifetime.lifetime_cost_cents, 0::bigint) / lifetime.lifetime_minutes
    ELSE 0::bigint
  END AS avg_cost_per_minute_cents,
  CASE
    WHEN s.subscribed AND s.subscription_tier = 'Basic' 
    THEN 1999 - COALESCE(monthly.current_month_cost_cents, 0::bigint)
    WHEN s.subscribed AND s.subscription_tier = 'Premium' 
    THEN 3999 - COALESCE(monthly.current_month_cost_cents, 0::bigint)
    ELSE 0 - COALESCE(monthly.current_month_cost_cents, 0::bigint)
  END AS current_month_profit_cents
FROM subscribers s
LEFT JOIN (
  SELECT 
    cu.user_id,
    SUM(cu.minutes_used) AS current_month_minutes,
    COUNT(*) AS current_month_sessions,
    SUM(cu.calculated_cost_cents) AS current_month_cost_cents,
    SUM(CASE WHEN cu.api_type = 'voice' THEN cu.calculated_cost_cents ELSE 0 END) AS current_month_voice_cost_cents,
    SUM(CASE WHEN cu.api_type = 'text' THEN cu.calculated_cost_cents ELSE 0 END) AS current_month_text_cost_cents
  FROM conversation_usage cu
  WHERE cu.session_start >= date_trunc('month', CURRENT_DATE::timestamp with time zone)
  GROUP BY cu.user_id
) monthly ON s.user_id = monthly.user_id
LEFT JOIN (
  SELECT 
    cu.user_id,
    SUM(cu.minutes_used) AS lifetime_minutes,
    COUNT(*) AS lifetime_sessions,
    SUM(cu.calculated_cost_cents) AS lifetime_cost_cents
  FROM conversation_usage cu
  GROUP BY cu.user_id
) lifetime ON s.user_id = lifetime.user_id;