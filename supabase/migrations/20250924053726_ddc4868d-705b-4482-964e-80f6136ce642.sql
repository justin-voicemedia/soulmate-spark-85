-- Fix the has_unlimited_access function to not use SECURITY DEFINER
-- This function is used to check if a user has unlimited access, but should not bypass RLS

DROP FUNCTION IF EXISTS public.has_unlimited_access(uuid);

-- Recreate without SECURITY DEFINER - the calling code should handle RLS policies appropriately
CREATE OR REPLACE FUNCTION public.has_unlimited_access(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
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