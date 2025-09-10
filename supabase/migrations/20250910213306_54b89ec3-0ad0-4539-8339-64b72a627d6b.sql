-- Add trial and usage tracking fields to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN trial_minutes_used INTEGER DEFAULT 0,
ADD COLUMN trial_minutes_limit INTEGER DEFAULT 500;

-- Add usage tracking table for detailed conversation tracking
CREATE TABLE public.conversation_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  minutes_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on conversation_usage table
ALTER TABLE public.conversation_usage ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own usage records
CREATE POLICY "Users can manage own usage" 
ON public.conversation_usage 
FOR ALL 
USING (user_id = auth.uid());

-- Update subscribers table to automatically start trial for new users
CREATE OR REPLACE FUNCTION public.handle_new_subscriber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- If no trial_start is set, start the trial
  IF NEW.trial_start IS NULL THEN
    NEW.trial_start = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new subscriber trial start
CREATE TRIGGER on_subscriber_insert
  BEFORE INSERT ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_subscriber();