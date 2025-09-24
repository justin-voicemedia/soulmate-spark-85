-- Add comprehensive subscriber management tables

-- Payment history table
CREATE TABLE public.payment_history (
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
CREATE TABLE public.billing_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  company_name TEXT,
  billing_address JSONB DEFAULT '{}', -- {street, city, state, zip, country}
  tax_id TEXT,
  billing_email TEXT,
  payment_method_id TEXT,
  payment_method_type TEXT, -- card, bank_account, etc.
  card_last_four TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plan change history
CREATE TABLE public.plan_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_plan TEXT,
  new_plan TEXT NOT NULL,
  old_price_cents INTEGER,
  new_price_cents INTEGER,
  reason TEXT, -- upgrade, downgrade, cancellation, etc.
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT, -- admin, user, system
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
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
CREATE TABLE public.account_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('refund', 'promotional', 'referral', 'compensation')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_amount_cents INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  reference_id TEXT, -- reference to payment, invoice, etc.
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referral system
CREATE TABLE public.referrals (
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
CREATE TABLE public.usage_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  total_minutes_used INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  features_used JSONB DEFAULT '[]', -- array of feature names used
  peak_usage_hour INTEGER, -- hour of day with most usage (0-23)
  device_types JSONB DEFAULT '[]', -- mobile, desktop, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Notification preferences
CREATE TABLE public.notification_preferences (
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
CREATE TABLE public.support_tickets (
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

-- Add indexes for better performance
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_date ON public.payment_history(payment_date);
CREATE INDEX idx_payment_history_status ON public.payment_history(status);

CREATE INDEX idx_plan_changes_user_id ON public.plan_changes(user_id);
CREATE INDEX idx_plan_changes_date ON public.plan_changes(effective_date);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX idx_account_credits_user_id ON public.account_credits(user_id);
CREATE INDEX idx_account_credits_status ON public.account_credits(status);
CREATE INDEX idx_account_credits_expires ON public.account_credits(expires_at);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

CREATE INDEX idx_usage_analytics_user_date ON public.usage_analytics(user_id, date);
CREATE INDEX idx_usage_analytics_date ON public.usage_analytics(date);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at);

-- Enable Row Level Security on all new tables
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user data access
CREATE POLICY "Users can view own payment history" ON public.payment_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own billing info" ON public.billing_info
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own billing info" ON public.billing_info
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own billing info" ON public.billing_info
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own plan changes" ON public.plan_changes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own credits" ON public.account_credits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can view own usage analytics" ON public.usage_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own support tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own support tickets" ON public.support_tickets
  FOR UPDATE USING (user_id = auth.uid());

-- Admin policies for all tables (service role can do everything)
CREATE POLICY "Service can manage payment history" ON public.payment_history FOR ALL USING (true);
CREATE POLICY "Service can manage billing info" ON public.billing_info FOR ALL USING (true);
CREATE POLICY "Service can manage plan changes" ON public.plan_changes FOR ALL USING (true);
CREATE POLICY "Service can manage invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Service can manage account credits" ON public.account_credits FOR ALL USING (true);
CREATE POLICY "Service can manage referrals" ON public.referrals FOR ALL USING (true);
CREATE POLICY "Service can manage usage analytics" ON public.usage_analytics FOR ALL USING (true);
CREATE POLICY "Service can manage notification preferences" ON public.notification_preferences FOR ALL USING (true);
CREATE POLICY "Service can manage support tickets" ON public.support_tickets FOR ALL USING (true);

-- Add updated_at triggers for tables that need them
CREATE TRIGGER update_billing_info_updated_at
  BEFORE UPDATE ON public.billing_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_account_credits_updated_at
  BEFORE UPDATE ON public.account_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_analytics_updated_at
  BEFORE UPDATE ON public.usage_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance existing subscribers table with additional fields
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS 
  customer_since TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS 
  last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS 
  total_lifetime_value_cents INTEGER DEFAULT 0;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS 
  referral_code TEXT UNIQUE;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS 
  referred_by_user_id UUID; -- reference to user who referred this user
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS 
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'cancelled', 'pending'));

-- Generate unique referral codes for existing subscribers
UPDATE public.subscribers 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
WHERE referral_code IS NULL;