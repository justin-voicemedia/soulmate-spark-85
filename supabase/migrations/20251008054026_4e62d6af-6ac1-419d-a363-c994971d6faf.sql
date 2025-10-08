-- Fix critical security issue: Remove public access to subscriptions table
-- This prevents exposure of Stripe customer IDs, subscription IDs, and billing information

-- First, drop all existing policies on subscriptions table
DROP POLICY IF EXISTS "Service can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Viewers can read all subscriptions" ON public.subscriptions;

-- Recreate policies with proper access control

-- 1. Service role can manage all subscriptions (for backend operations)
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Authenticated users can only view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Authenticated users can insert their own subscription
CREATE POLICY "Users can insert own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Authenticated users can update their own subscription
CREATE POLICY "Users can update own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. Viewer role can read all subscriptions (for admin dashboard)
CREATE POLICY "Viewers can read all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

-- Note: No public/anon access is granted, preventing data exposure