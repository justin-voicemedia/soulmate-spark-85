-- Add tester flag to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS is_tester boolean DEFAULT false;

-- Create a function to check if user has unlimited access (subscriber or tester)
CREATE OR REPLACE FUNCTION public.has_unlimited_access(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND (subscribed = true OR is_tester = true)
  ) OR EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active'
    AND plan_type IN ('basic', 'premium', 'tester')
  );
$$;