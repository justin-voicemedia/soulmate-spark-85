-- Add mood tracking for conversations
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  companion_id UUID NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  user_companion_id UUID REFERENCES public.user_companions(id) ON DELETE CASCADE,
  mood_type TEXT NOT NULL CHECK (mood_type IN ('happy', 'sad', 'excited', 'anxious', 'angry', 'calm', 'lonely', 'loved', 'stressed', 'neutral')),
  intensity INTEGER NOT NULL DEFAULT 5 CHECK (intensity >= 1 AND intensity <= 10),
  message_context TEXT,
  detected_automatically BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_companion 
ON public.mood_entries(user_id, companion_id);

CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at 
ON public.mood_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mood_entries_mood_type 
ON public.mood_entries(mood_type);

-- Enable RLS
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own mood entries"
ON public.mood_entries
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mood entries"
ON public.mood_entries
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mood entries"
ON public.mood_entries
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Viewers can read all mood entries"
ON public.mood_entries
FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Service can manage mood entries"
ON public.mood_entries
FOR ALL
USING (true);

-- Function to get recent mood trends
CREATE OR REPLACE FUNCTION get_mood_trends(
  p_user_id UUID,
  p_companion_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  mood_type TEXT,
  count BIGINT,
  avg_intensity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.mood_type,
    COUNT(*) as count,
    ROUND(AVG(m.intensity), 1) as avg_intensity
  FROM public.mood_entries m
  WHERE 
    m.user_id = p_user_id 
    AND m.companion_id = p_companion_id
    AND m.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY m.mood_type
  ORDER BY count DESC;
END;
$$;