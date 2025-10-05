-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service can manage roles"
ON public.user_roles
FOR ALL
USING (true);

-- Update existing tables to allow viewer read access
-- Companions table - viewers can read all
CREATE POLICY "Viewers can read all companions"
ON public.companions
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Subscriptions table - viewers can read all
CREATE POLICY "Viewers can read all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Subscribers table - viewers can read all
CREATE POLICY "Viewers can read all subscribers"
ON public.subscribers
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Usage analytics - viewers can read all
CREATE POLICY "Viewers can read all usage analytics"
ON public.usage_analytics
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Conversation usage - viewers can read all
CREATE POLICY "Viewers can read all conversation usage"
ON public.conversation_usage
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- User companions - viewers can read all
CREATE POLICY "Viewers can read all user companions"
ON public.user_companions
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Payment history - viewers can read all
CREATE POLICY "Viewers can read all payment history"
ON public.payment_history
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Invoices - viewers can read all
CREATE POLICY "Viewers can read all invoices"
ON public.invoices
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Support tickets - viewers can read all
CREATE POLICY "Viewers can read all support tickets"
ON public.support_tickets
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Profiles - viewers can read all
CREATE POLICY "Viewers can read all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Billing info - viewers can read all
CREATE POLICY "Viewers can read all billing info"
ON public.billing_info
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Account credits - viewers can read all
CREATE POLICY "Viewers can read all account credits"
ON public.account_credits
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Plan changes - viewers can read all
CREATE POLICY "Viewers can read all plan changes"
ON public.plan_changes
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Referrals - viewers can read all
CREATE POLICY "Viewers can read all referrals"
ON public.referrals
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Notification preferences - viewers can read all
CREATE POLICY "Viewers can read all notification preferences"
ON public.notification_preferences
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));

-- Relationship prompts - viewers can read all
CREATE POLICY "Viewers can read all relationship prompts"
ON public.relationship_prompts
FOR SELECT
USING (public.has_role(auth.uid(), 'viewer'));