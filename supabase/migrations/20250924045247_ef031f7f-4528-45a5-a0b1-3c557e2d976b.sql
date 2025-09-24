-- Add comprehensive subscriber management tables (handling existing tables)

-- Payment history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'cancelled', 'refunded')),
  payment_method TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Billing information table
CREATE TABLE IF NOT EXISTS public.billing_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  company_name TEXT,
  billing_address JSONB DEFAULT '{}',
  tax_id TEXT,
  billing_email TEXT,
  payment_method_id TEXT,
  payment_method_type TEXT,
  card_last_four TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plan change history
CREATE TABLE IF NOT EXISTS public.plan_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_plan TEXT,
  new_plan TEXT NOT NULL,
  old_price_cents INTEGER,
  new_price_cents INTEGER,
  reason TEXT,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  invoice_number TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  amount_due_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  invoice_pdf_url TEXT,
  line_items JSONB DEFAULT '[]',
  tax_amount_cents INTEGER DEFAULT 0,
  discount_amount_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Account credits/balance table
CREATE TABLE IF NOT EXISTS public.account_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('refund', 'promotional', 'referral', 'compensation')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_amount_cents INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  reference_id TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referral system
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID,
  referral_code TEXT NOT NULL UNIQUE,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  reward_amount_cents INTEGER,
  reward_currency TEXT DEFAULT 'usd',
  reward_given_at TIMESTAMP WITH TIME ZONE,
  conversion_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced usage analytics
CREATE TABLE IF NOT EXISTS public.usage_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  total_minutes_used INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  features_used JSONB DEFAULT '[]',
  peak_usage_hour INTEGER,
  device_types JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  usage_alerts BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  weekly_reports BOOLEAN DEFAULT true,
  trial_expiry_alerts BOOLEAN DEFAULT true,
  plan_change_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  category TEXT CHECK (category IN ('billing', 'technical', 'feature_request', 'bug_report', 'general')),
  assigned_to TEXT,
  resolution TEXT,
  customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes if they don't exist
DO $$ 
BEGIN
  -- Payment history indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payment_history_user_id') THEN
    CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payment_history_date') THEN
    CREATE INDEX idx_payment_history_date ON public.payment_history(payment_date);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payment_history_status') THEN
    CREATE INDEX idx_payment_history_status ON public.payment_history(status);
  END IF;

  -- Plan changes indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_plan_changes_user_id') THEN
    CREATE INDEX idx_plan_changes_user_id ON public.plan_changes(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_plan_changes_date') THEN
    CREATE INDEX idx_plan_changes_date ON public.plan_changes(effective_date);
  END IF;

  -- Invoices indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_user_id') THEN
    CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_status') THEN
    CREATE INDEX idx_invoices_status ON public.invoices(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_due_date') THEN
    CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
  END IF;

  -- Account credits indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_account_credits_user_id') THEN
    CREATE INDEX idx_account_credits_user_id ON public.account_credits(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_account_credits_status') THEN
    CREATE INDEX idx_account_credits_status ON public.account_credits(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_account_credits_expires') THEN
    CREATE INDEX idx_account_credits_expires ON public.account_credits(expires_at);
  END IF;

  -- Referrals indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_referrer') THEN
    CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_referred') THEN
    CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_code') THEN
    CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
  END IF;

  -- Usage analytics indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_analytics_user_date') THEN
    CREATE INDEX idx_usage_analytics_user_date ON public.usage_analytics(user_id, date);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_analytics_date') THEN
    CREATE INDEX idx_usage_analytics_date ON public.usage_analytics(date);
  END IF;

  -- Support tickets indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_support_tickets_user_id') THEN
    CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_support_tickets_status') THEN
    CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_support_tickets_created') THEN
    CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at);
  END IF;
END $$;