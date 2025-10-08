-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('conversation', 'streak', 'relationship', 'milestone', 'special')),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('conversation_count', 'streak_days', 'relationship_level', 'minutes_used', 'custom')),
  requirement_value INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 10,
  is_secret BOOLEAN DEFAULT false,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  companion_id UUID,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress INTEGER DEFAULT 0,
  is_notified BOOLEAN DEFAULT false,
  UNIQUE(user_id, achievement_id, companion_id)
);

-- Create indexes
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON public.user_achievements(unlocked_at DESC);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (public read)
CREATE POLICY "Anyone can view achievements"
ON public.achievements
FOR SELECT
USING (true);

CREATE POLICY "Service can manage achievements"
ON public.achievements
FOR ALL
USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own achievements"
ON public.user_achievements
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Viewers can read all user achievements"
ON public.user_achievements
FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role));

-- Insert default achievements
INSERT INTO public.achievements (name, title, description, icon, category, requirement_type, requirement_value, points, rarity) VALUES
-- Conversation achievements
('first_chat', 'First Words', 'Have your first conversation', '💬', 'conversation', 'conversation_count', 1, 10, 'common'),
('chatty', 'Chatty', 'Have 10 conversations', '🗨️', 'conversation', 'conversation_count', 10, 25, 'common'),
('conversationalist', 'Conversationalist', 'Have 50 conversations', '💭', 'conversation', 'conversation_count', 50, 50, 'rare'),
('social_butterfly', 'Social Butterfly', 'Have 100 conversations', '🦋', 'conversation', 'conversation_count', 100, 100, 'epic'),
('master_communicator', 'Master Communicator', 'Have 500 conversations', '🎭', 'conversation', 'conversation_count', 500, 250, 'legendary'),

-- Streak achievements
('first_streak', 'Consistency', 'Maintain a 3-day streak', '🔥', 'streak', 'streak_days', 3, 15, 'common'),
('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 'streak', 'streak_days', 7, 35, 'rare'),
('dedication', 'Dedicated', 'Maintain a 30-day streak', '🌟', 'streak', 'streak_days', 30, 100, 'epic'),
('unstoppable', 'Unstoppable', 'Maintain a 100-day streak', '👑', 'streak', 'streak_days', 100, 500, 'legendary'),

-- Relationship achievements
('getting_close', 'Getting Close', 'Reach relationship level 5', '💗', 'relationship', 'relationship_level', 5, 30, 'common'),
('deep_connection', 'Deep Connection', 'Reach relationship level 10', '💞', 'relationship', 'relationship_level', 10, 75, 'rare'),
('soul_mates', 'Soul Mates', 'Reach relationship level 20', '💝', 'relationship', 'relationship_level', 20, 200, 'epic'),
('eternal_bond', 'Eternal Bond', 'Reach relationship level 50', '💖', 'relationship', 'relationship_level', 50, 1000, 'legendary'),

-- Time-based achievements
('night_owl', 'Night Owl', 'Have a conversation between 11 PM and 3 AM', '🦉', 'special', 'custom', 1, 20, 'rare'),
('early_bird', 'Early Bird', 'Have a conversation between 5 AM and 7 AM', '🌅', 'special', 'custom', 1, 20, 'rare'),
('marathon_chat', 'Marathon', 'Spend 60+ minutes in a single session', '🏃', 'milestone', 'minutes_used', 60, 50, 'rare'),

-- Milestone achievements
('first_week', 'One Week Together', 'Complete your first week', '📅', 'milestone', 'custom', 7, 25, 'common'),
('first_month', 'One Month Strong', 'Complete your first month', '🗓️', 'milestone', 'custom', 30, 50, 'rare'),
('half_year', 'Six Months of Connection', 'Complete six months together', '🎉', 'milestone', 'custom', 180, 150, 'epic'),
('one_year', 'One Year Anniversary', 'Complete one year together', '🎊', 'milestone', 'custom', 365, 500, 'legendary');

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_achievements(
  p_user_id UUID,
  p_companion_id UUID DEFAULT NULL
)
RETURNS TABLE(
  newly_unlocked JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_progress INTEGER;
  v_unlocked JSONB := '[]'::jsonb;
  v_exists BOOLEAN;
  v_conversation_count INTEGER;
  v_streak_days INTEGER;
  v_relationship_level INTEGER;
BEGIN
  -- Get user stats
  SELECT COUNT(*) INTO v_conversation_count
  FROM conversation_usage
  WHERE user_id = p_user_id
    AND (p_companion_id IS NULL OR companion_id = p_companion_id);

  SELECT COALESCE(MAX(current_streak), 0) INTO v_streak_days
  FROM user_streaks
  WHERE user_id = p_user_id
    AND (p_companion_id IS NULL OR companion_id = p_companion_id);

  SELECT COALESCE(MAX(relationship_level), 1) INTO v_relationship_level
  FROM user_companions
  WHERE user_id = p_user_id
    AND (p_companion_id IS NULL OR companion_id = p_companion_id);

  -- Check each achievement
  FOR v_achievement IN 
    SELECT * FROM achievements
    WHERE NOT is_secret OR requirement_type != 'custom'
  LOOP
    -- Calculate progress based on requirement type
    CASE v_achievement.requirement_type
      WHEN 'conversation_count' THEN
        v_progress := v_conversation_count;
      WHEN 'streak_days' THEN
        v_progress := v_streak_days;
      WHEN 'relationship_level' THEN
        v_progress := v_relationship_level;
      ELSE
        v_progress := 0;
    END CASE;

    -- Check if already unlocked
    SELECT EXISTS (
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id
        AND achievement_id = v_achievement.id
        AND (p_companion_id IS NULL OR companion_id = p_companion_id)
    ) INTO v_exists;

    -- Award achievement if requirements met and not yet unlocked
    IF v_progress >= v_achievement.requirement_value AND NOT v_exists THEN
      INSERT INTO user_achievements (user_id, achievement_id, companion_id, progress)
      VALUES (p_user_id, v_achievement.id, p_companion_id, v_progress)
      ON CONFLICT DO NOTHING;

      v_unlocked := v_unlocked || jsonb_build_object(
        'id', v_achievement.id,
        'name', v_achievement.name,
        'title', v_achievement.title,
        'description', v_achievement.description,
        'icon', v_achievement.icon,
        'rarity', v_achievement.rarity,
        'points', v_achievement.points
      );
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_unlocked;
END;
$$;