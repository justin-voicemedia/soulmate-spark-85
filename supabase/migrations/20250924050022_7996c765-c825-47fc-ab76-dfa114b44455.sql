-- Add cost tracking fields to existing tables

-- Add cost tracking columns to conversation_usage table
ALTER TABLE public.conversation_usage ADD COLUMN IF NOT EXISTS 
  calculated_cost_cents INTEGER DEFAULT 0;
ALTER TABLE public.conversation_usage ADD COLUMN IF NOT EXISTS 
  input_tokens INTEGER DEFAULT 0;
ALTER TABLE public.conversation_usage ADD COLUMN IF NOT EXISTS 
  output_tokens INTEGER DEFAULT 0;
ALTER TABLE public.conversation_usage ADD COLUMN IF NOT EXISTS 
  characters_generated INTEGER DEFAULT 0;

-- Add cost tracking columns to usage_analytics table  
ALTER TABLE public.usage_analytics ADD COLUMN IF NOT EXISTS 
  total_cost_cents INTEGER DEFAULT 0;
ALTER TABLE public.usage_analytics ADD COLUMN IF NOT EXISTS 
  average_cost_per_session_cents INTEGER DEFAULT 0;
ALTER TABLE public.usage_analytics ADD COLUMN IF NOT EXISTS 
  voice_cost_cents INTEGER DEFAULT 0;
ALTER TABLE public.usage_analytics ADD COLUMN IF NOT EXISTS 
  text_cost_cents INTEGER DEFAULT 0;

-- Create a comprehensive user costs view
CREATE OR REPLACE VIEW public.user_cost_analytics AS
SELECT 
    s.user_id,
    s.email,
    s.subscribed,
    s.subscription_tier,
    s.is_tester,
    s.total_lifetime_value_cents,
    s.trial_minutes_used,
    s.trial_minutes_limit,
    -- Current month costs
    COALESCE(current_month.total_cost_cents, 0) as current_month_cost_cents,
    COALESCE(current_month.total_sessions, 0) as current_month_sessions,
    COALESCE(current_month.total_minutes, 0) as current_month_minutes,
    COALESCE(current_month.voice_cost_cents, 0) as current_month_voice_cost_cents,
    COALESCE(current_month.text_cost_cents, 0) as current_month_text_cost_cents,
    -- All time costs
    COALESCE(all_time.total_cost_cents, 0) as lifetime_cost_cents,
    COALESCE(all_time.total_sessions, 0) as lifetime_sessions,
    COALESCE(all_time.total_minutes, 0) as lifetime_minutes,
    -- Cost efficiency metrics
    CASE 
        WHEN COALESCE(current_month.total_sessions, 0) > 0 
        THEN COALESCE(current_month.total_cost_cents, 0) / current_month.total_sessions
        ELSE 0 
    END as avg_cost_per_session_cents,
    CASE 
        WHEN COALESCE(current_month.total_minutes, 0) > 0 
        THEN COALESCE(current_month.total_cost_cents, 0) / current_month.total_minutes  
        ELSE 0 
    END as avg_cost_per_minute_cents,
    -- Profit calculation (subscription value vs costs)
    CASE 
        WHEN s.subscribed AND s.subscription_tier = 'Basic' 
        THEN 1999 - COALESCE(current_month.total_cost_cents, 0) -- $19.99 basic plan
        WHEN s.subscribed AND s.subscription_tier = 'Premium' 
        THEN 3999 - COALESCE(current_month.total_cost_cents, 0) -- $39.99 premium plan
        ELSE 0 - COALESCE(current_month.total_cost_cents, 0) -- Free users = negative profit
    END as current_month_profit_cents,
    s.customer_since,
    s.last_login
FROM public.subscribers s

-- Current month aggregation
LEFT JOIN (
    SELECT 
        user_id,
        SUM(total_cost_cents) as total_cost_cents,
        SUM(total_sessions) as total_sessions,
        SUM(total_minutes_used) as total_minutes,
        SUM(voice_cost_cents) as voice_cost_cents,
        SUM(text_cost_cents) as text_cost_cents
    FROM public.usage_analytics 
    WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY user_id
) current_month ON s.user_id = current_month.user_id

-- All time aggregation  
LEFT JOIN (
    SELECT 
        user_id,
        SUM(total_cost_cents) as total_cost_cents,
        SUM(total_sessions) as total_sessions,
        SUM(total_minutes_used) as total_minutes
    FROM public.usage_analytics 
    GROUP BY user_id
) all_time ON s.user_id = all_time.user_id;

-- Create indexes for the new cost columns
CREATE INDEX IF NOT EXISTS idx_conversation_usage_cost ON public.conversation_usage(calculated_cost_cents);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_cost ON public.usage_analytics(total_cost_cents);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_date_cost ON public.usage_analytics(date, total_cost_cents);

-- Update existing conversation_usage records to have basic cost estimates
UPDATE public.conversation_usage 
SET calculated_cost_cents = (
  CASE 
    WHEN api_type = 'voice' THEN 
      -- Rough estimate: $0.006 per minute for voice
      COALESCE(minutes_used, 0) * 0.6 -- 0.6 cents per minute
    WHEN api_type = 'text' THEN 
      -- Rough estimate: $0.15 per 1M tokens (mostly input)
      COALESCE(tokens_used, 0) * 0.15 / 10000 -- cents per token
    ELSE 0
  END
)::INTEGER
WHERE calculated_cost_cents = 0 AND (minutes_used > 0 OR tokens_used > 0);

-- Create function to get user profitability summary
CREATE OR REPLACE FUNCTION public.get_user_profitability_summary()
RETURNS TABLE (
  total_users bigint,
  profitable_users bigint,
  break_even_users bigint,
  unprofitable_users bigint,
  total_monthly_revenue_cents bigint,
  total_monthly_costs_cents bigint,
  total_monthly_profit_cents bigint,
  average_profit_per_user_cents numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE current_month_profit_cents > 100) as profitable_users, -- > $1 profit
    COUNT(*) FILTER (WHERE current_month_profit_cents BETWEEN -100 AND 100) as break_even_users,
    COUNT(*) FILTER (WHERE current_month_profit_cents < -100) as unprofitable_users,
    COALESCE(SUM(
      CASE 
        WHEN subscribed AND subscription_tier = 'Basic' THEN 1999
        WHEN subscribed AND subscription_tier = 'Premium' THEN 3999
        ELSE 0 
      END
    ), 0) as total_monthly_revenue_cents,
    COALESCE(SUM(current_month_cost_cents), 0) as total_monthly_costs_cents,
    COALESCE(SUM(current_month_profit_cents), 0) as total_monthly_profit_cents,
    COALESCE(AVG(current_month_profit_cents), 0) as average_profit_per_user_cents
  FROM public.user_cost_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;