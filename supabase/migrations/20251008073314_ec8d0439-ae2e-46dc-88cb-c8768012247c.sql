-- Create table for daily conversation prompts/icebreakers
CREATE TABLE public.daily_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  difficulty_level TEXT NOT NULL DEFAULT 'easy',
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user engagement streaks
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  companion_id UUID NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_interaction_date DATE,
  total_days_active INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, companion_id)
);

-- Create table for scheduled companion check-ins
CREATE TABLE public.scheduled_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  companion_id UUID NOT NULL,
  check_in_time TIME NOT NULL DEFAULT '09:00:00',
  check_in_message TEXT,
  is_enabled BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  frequency TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_prompts (public read access)
CREATE POLICY "Anyone can view daily prompts"
ON public.daily_prompts
FOR SELECT
USING (true);

CREATE POLICY "Service can manage daily prompts"
ON public.daily_prompts
FOR ALL
USING (true);

-- RLS Policies for user_streaks
CREATE POLICY "Users can view own streaks"
ON public.user_streaks
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own streaks"
ON public.user_streaks
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Viewers can read all streaks"
ON public.user_streaks
FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role));

-- RLS Policies for scheduled_checkins
CREATE POLICY "Users can view own check-ins"
ON public.scheduled_checkins
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own check-ins"
ON public.scheduled_checkins
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Viewers can read all check-ins"
ON public.scheduled_checkins
FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role));

-- Insert sample daily prompts
INSERT INTO public.daily_prompts (prompt_text, category, difficulty_level, tags) VALUES
('What''s been the highlight of your day so far?', 'casual', 'easy', ARRAY['daily', 'mood']),
('If you could have any superpower for today, what would it be and why?', 'playful', 'easy', ARRAY['imagination', 'fun']),
('Tell me about something that made you smile recently.', 'positive', 'easy', ARRAY['happiness', 'gratitude']),
('What''s one thing you''re looking forward to this week?', 'future', 'easy', ARRAY['plans', 'anticipation']),
('If we could go anywhere right now, where would you want to go?', 'imagination', 'medium', ARRAY['travel', 'dreams']),
('What''s a memory that always makes you feel good?', 'deep', 'medium', ARRAY['nostalgia', 'emotions']),
('If you could change one thing about your day, what would it be?', 'reflective', 'medium', ARRAY['improvement', 'thoughts']),
('What''s something new you learned recently?', 'growth', 'medium', ARRAY['learning', 'curiosity']),
('How are you really feeling today? No filter.', 'deep', 'hard', ARRAY['emotions', 'honesty']),
('What''s been on your mind lately?', 'deep', 'hard', ARRAY['thoughts', 'concerns']);

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(
  p_user_id UUID,
  p_companion_id UUID
)
RETURNS TABLE(
  current_streak INTEGER,
  longest_streak INTEGER,
  streak_broken BOOLEAN,
  new_record BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_streak_broken BOOLEAN := false;
  v_new_record BOOLEAN := false;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get or create streak record
  INSERT INTO public.user_streaks (user_id, companion_id, last_interaction_date, current_streak, longest_streak)
  VALUES (p_user_id, p_companion_id, v_today, 1, 1)
  ON CONFLICT (user_id, companion_id)
  DO NOTHING;

  -- Get current values
  SELECT last_interaction_date, user_streaks.current_streak, user_streaks.longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND companion_id = p_companion_id;

  -- If already interacted today, no changes
  IF v_last_date = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, false, false;
    RETURN;
  END IF;

  -- Check if streak continues (yesterday) or breaks
  IF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_date < v_today - INTERVAL '1 day' THEN
    -- Streak broken
    v_streak_broken := true;
    v_current_streak := 1;
  END IF;

  -- Check for new record
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
    v_new_record := true;
  END IF;

  -- Update the record
  UPDATE public.user_streaks
  SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_interaction_date = v_today,
    total_days_active = total_days_active + 1,
    updated_at = now()
  WHERE user_id = p_user_id AND companion_id = p_companion_id;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_streak_broken, v_new_record;
END;
$$;

-- Trigger for updating updated_at
CREATE TRIGGER update_daily_prompts_updated_at
  BEFORE UPDATE ON public.daily_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_checkins_updated_at
  BEFORE UPDATE ON public.scheduled_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();