-- Complete the subscriber database setup with RLS and additional features

-- Enable Row Level Security on all new tables (if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payment_history' AND rowsecurity = true) THEN
    ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'billing_info' AND rowsecurity = true) THEN
    ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'plan_changes' AND rowsecurity = true) THEN
    ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices' AND rowsecurity = true) THEN
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'account_credits' AND rowsecurity = true) THEN
    ALTER TABLE public.account_credits ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'referrals' AND rowsecurity = true) THEN
    ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'usage_analytics' AND rowsecurity = true) THEN
    ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_preferences' AND rowsecurity = true) THEN
    ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'support_tickets' AND rowsecurity = true) THEN
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS Policies (if they don't exist)
DO $$
BEGIN
  -- Payment history policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own payment history' AND tablename = 'payment_history') THEN
    CREATE POLICY "Users can view own payment history" ON public.payment_history
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage payment history' AND tablename = 'payment_history') THEN
    CREATE POLICY "Service can manage payment history" ON public.payment_history FOR ALL USING (true);
  END IF;

  -- Billing info policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own billing info' AND tablename = 'billing_info') THEN
    CREATE POLICY "Users can view own billing info" ON public.billing_info
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own billing info' AND tablename = 'billing_info') THEN
    CREATE POLICY "Users can update own billing info" ON public.billing_info
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own billing info' AND tablename = 'billing_info') THEN
    CREATE POLICY "Users can insert own billing info" ON public.billing_info
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage billing info' AND tablename = 'billing_info') THEN
    CREATE POLICY "Service can manage billing info" ON public.billing_info FOR ALL USING (true);
  END IF;

  -- Plan changes policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own plan changes' AND tablename = 'plan_changes') THEN
    CREATE POLICY "Users can view own plan changes" ON public.plan_changes
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage plan changes' AND tablename = 'plan_changes') THEN
    CREATE POLICY "Service can manage plan changes" ON public.plan_changes FOR ALL USING (true);
  END IF;

  -- Invoices policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own invoices' AND tablename = 'invoices') THEN
    CREATE POLICY "Users can view own invoices" ON public.invoices
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage invoices' AND tablename = 'invoices') THEN
    CREATE POLICY "Service can manage invoices" ON public.invoices FOR ALL USING (true);
  END IF;

  -- Account credits policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own credits' AND tablename = 'account_credits') THEN
    CREATE POLICY "Users can view own credits" ON public.account_credits
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage account credits' AND tablename = 'account_credits') THEN
    CREATE POLICY "Service can manage account credits" ON public.account_credits FOR ALL USING (true);
  END IF;

  -- Referrals policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Users can view own referrals" ON public.referrals
      FOR SELECT USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Service can manage referrals" ON public.referrals FOR ALL USING (true);
  END IF;

  -- Usage analytics policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own usage analytics' AND tablename = 'usage_analytics') THEN
    CREATE POLICY "Users can view own usage analytics" ON public.usage_analytics
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage usage analytics' AND tablename = 'usage_analytics') THEN
    CREATE POLICY "Service can manage usage analytics" ON public.usage_analytics FOR ALL USING (true);
  END IF;

  -- Notification preferences policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own notification preferences' AND tablename = 'notification_preferences') THEN
    CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
      FOR ALL USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage notification preferences' AND tablename = 'notification_preferences') THEN
    CREATE POLICY "Service can manage notification preferences" ON public.notification_preferences FOR ALL USING (true);
  END IF;

  -- Support tickets policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own support tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Users can view own support tickets" ON public.support_tickets
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own support tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Users can create own support tickets" ON public.support_tickets
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own support tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Users can update own support tickets" ON public.support_tickets
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can manage support tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Service can manage support tickets" ON public.support_tickets FOR ALL USING (true);
  END IF;
END $$;

-- Add updated_at triggers for tables that need them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_billing_info_updated_at') THEN
    CREATE TRIGGER update_billing_info_updated_at
      BEFORE UPDATE ON public.billing_info
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
    CREATE TRIGGER update_invoices_updated_at
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_account_credits_updated_at') THEN
    CREATE TRIGGER update_account_credits_updated_at
      BEFORE UPDATE ON public.account_credits
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_referrals_updated_at') THEN
    CREATE TRIGGER update_referrals_updated_at
      BEFORE UPDATE ON public.referrals
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_analytics_updated_at') THEN
    CREATE TRIGGER update_usage_analytics_updated_at
      BEFORE UPDATE ON public.usage_analytics
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_preferences_updated_at') THEN
    CREATE TRIGGER update_notification_preferences_updated_at
      BEFORE UPDATE ON public.notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_support_tickets_updated_at') THEN
    CREATE TRIGGER update_support_tickets_updated_at
      BEFORE UPDATE ON public.support_tickets
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

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
  referred_by_user_id UUID;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS 
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'cancelled', 'pending'));

-- Generate unique referral codes for existing subscribers that don't have one
UPDATE public.subscribers 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
WHERE referral_code IS NULL;

-- Create function to generate unique ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        new_number := 'TICKET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        
        IF NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to automatically set ticket number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := public.generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger to auto-generate ticket numbers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_support_ticket_number') THEN
    CREATE TRIGGER set_support_ticket_number
      BEFORE INSERT ON public.support_tickets
      FOR EACH ROW
      EXECUTE FUNCTION public.set_ticket_number();
  END IF;
END $$;