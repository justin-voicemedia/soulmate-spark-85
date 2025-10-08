-- Create memory categories table
CREATE TABLE public.memory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory tags table
CREATE TABLE public.memory_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create companion memories table (enhanced version)
CREATE TABLE public.companion_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  companion_id UUID NOT NULL,
  category_id UUID REFERENCES public.memory_categories(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL DEFAULT 'general',
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, companion_id, memory_key)
);

-- Enable RLS
ALTER TABLE public.memory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memory_categories (public read)
CREATE POLICY "Anyone can view memory categories"
ON public.memory_categories
FOR SELECT
USING (true);

CREATE POLICY "Service can manage memory categories"
ON public.memory_categories
FOR ALL
USING (true);

-- RLS Policies for memory_tags (public read)
CREATE POLICY "Anyone can view memory tags"
ON public.memory_tags
FOR SELECT
USING (true);

CREATE POLICY "Service can manage memory tags"
ON public.memory_tags
FOR ALL
USING (true);

-- RLS Policies for companion_memories
CREATE POLICY "Users can view own memories"
ON public.companion_memories
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own memories"
ON public.companion_memories
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Viewers can read all memories"
ON public.companion_memories
FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role));

-- Insert default memory categories
INSERT INTO public.memory_categories (name, description, icon, color) VALUES
('Personal', 'Personal information and preferences', '👤', 'blue'),
('Family', 'Family members and relationships', '👨‍👩‍👧‍👦', 'purple'),
('Work', 'Career and professional life', '💼', 'green'),
('Hobbies', 'Interests and recreational activities', '🎨', 'orange'),
('Health', 'Health and wellness information', '🏥', 'red'),
('Goals', 'Aspirations and objectives', '🎯', 'yellow'),
('Events', 'Important dates and occasions', '📅', 'pink'),
('Preferences', 'Likes, dislikes, and choices', '⭐', 'cyan');

-- Function to search memories
CREATE OR REPLACE FUNCTION public.search_memories(
  p_user_id UUID,
  p_companion_id UUID,
  p_search_term TEXT,
  p_category_id UUID DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  memory_key TEXT,
  memory_value TEXT,
  memory_type TEXT,
  category_id UUID,
  category_name TEXT,
  tags TEXT[],
  importance INTEGER,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.memory_key,
    cm.memory_value,
    cm.memory_type,
    cm.category_id,
    mc.name as category_name,
    cm.tags,
    cm.importance,
    cm.last_accessed_at,
    cm.access_count,
    cm.created_at
  FROM public.companion_memories cm
  LEFT JOIN public.memory_categories mc ON cm.category_id = mc.id
  WHERE 
    cm.user_id = p_user_id 
    AND cm.companion_id = p_companion_id
    AND (
      p_search_term IS NULL 
      OR cm.memory_key ILIKE '%' || p_search_term || '%'
      OR cm.memory_value ILIKE '%' || p_search_term || '%'
    )
    AND (p_category_id IS NULL OR cm.category_id = p_category_id)
    AND (p_tags IS NULL OR cm.tags && p_tags)
  ORDER BY 
    cm.importance DESC,
    cm.last_accessed_at DESC NULLS LAST,
    cm.created_at DESC;
END;
$$;

-- Function to record memory access
CREATE OR REPLACE FUNCTION public.record_memory_access(
  p_memory_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.companion_memories
  SET 
    last_accessed_at = NOW(),
    access_count = access_count + 1,
    updated_at = NOW()
  WHERE id = p_memory_id;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_memory_categories_updated_at
  BEFORE UPDATE ON public.memory_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companion_memories_updated_at
  BEFORE UPDATE ON public.companion_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();