-- Fix security warnings: set search_path for functions

-- Drop and recreate calculate_xp_for_level with proper search_path
DROP FUNCTION IF EXISTS calculate_xp_for_level(INTEGER);

CREATE OR REPLACE FUNCTION calculate_xp_for_level(level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 100 * POWER(1.5, level - 1)::INTEGER;
END;
$$;

-- Drop and recreate add_relationship_xp with proper search_path
DROP FUNCTION IF EXISTS add_relationship_xp(UUID, INTEGER);

CREATE OR REPLACE FUNCTION add_relationship_xp(
  p_user_companion_id UUID,
  p_xp_amount INTEGER
)
RETURNS TABLE(
  leveled_up BOOLEAN,
  new_level INTEGER,
  new_xp INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_level INTEGER;
  v_current_xp INTEGER;
  v_xp_needed INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := FALSE;
BEGIN
  -- Get current stats
  SELECT relationship_level, relationship_xp, relationship_xp_to_next_level
  INTO v_current_level, v_current_xp, v_xp_needed
  FROM public.user_companions
  WHERE id = p_user_companion_id;

  -- Add XP
  v_new_xp := v_current_xp + p_xp_amount;
  v_new_level := v_current_level;

  -- Check for level up
  WHILE v_new_xp >= v_xp_needed LOOP
    v_new_xp := v_new_xp - v_xp_needed;
    v_new_level := v_new_level + 1;
    v_xp_needed := calculate_xp_for_level(v_new_level);
    v_leveled_up := TRUE;
  END LOOP;

  -- Update the record
  UPDATE public.user_companions
  SET 
    relationship_xp = v_new_xp,
    relationship_level = v_new_level,
    relationship_xp_to_next_level = v_xp_needed,
    total_interactions = total_interactions + 1,
    last_interaction_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_companion_id;

  RETURN QUERY SELECT v_leveled_up, v_new_level, v_new_xp;
END;
$$;