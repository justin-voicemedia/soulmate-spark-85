-- Create conversation messages table
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  companion_id UUID NOT NULL,
  user_companion_id UUID REFERENCES public.user_companions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.conversation_usage(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_conversation_messages_user_companion ON public.conversation_messages(user_id, companion_id);
CREATE INDEX idx_conversation_messages_session ON public.conversation_messages(session_id);
CREATE INDEX idx_conversation_messages_created_at ON public.conversation_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own conversation messages"
ON public.conversation_messages
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversation messages"
ON public.conversation_messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own conversation messages"
ON public.conversation_messages
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Viewers can read all conversation messages"
ON public.conversation_messages
FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role));

-- Function to search conversation history
CREATE OR REPLACE FUNCTION public.search_conversation_history(
  p_user_id UUID,
  p_companion_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  session_id UUID,
  role TEXT,
  content TEXT,
  metadata JSONB,
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
    cm.session_id,
    cm.role,
    cm.content,
    cm.metadata,
    cm.created_at
  FROM public.conversation_messages cm
  WHERE 
    cm.user_id = p_user_id 
    AND cm.companion_id = p_companion_id
    AND (p_search_term IS NULL OR cm.content ILIKE '%' || p_search_term || '%')
    AND (p_start_date IS NULL OR cm.created_at >= p_start_date)
    AND (p_end_date IS NULL OR cm.created_at <= p_end_date)
  ORDER BY cm.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get conversation sessions
CREATE OR REPLACE FUNCTION public.get_conversation_sessions(
  p_user_id UUID,
  p_companion_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  session_id UUID,
  session_start TIMESTAMP WITH TIME ZONE,
  session_end TIMESTAMP WITH TIME ZONE,
  message_count BIGINT,
  first_message TEXT,
  minutes_used INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id as session_id,
    cu.session_start,
    cu.session_end,
    COUNT(cm.id) as message_count,
    (SELECT cm2.content 
     FROM public.conversation_messages cm2 
     WHERE cm2.session_id = cu.id 
     AND cm2.role = 'user'
     ORDER BY cm2.created_at ASC 
     LIMIT 1) as first_message,
    cu.minutes_used
  FROM public.conversation_usage cu
  LEFT JOIN public.conversation_messages cm ON cm.session_id = cu.id
  WHERE 
    cu.user_id = p_user_id 
    AND cu.companion_id = p_companion_id
  GROUP BY cu.id, cu.session_start, cu.session_end, cu.minutes_used
  ORDER BY cu.session_start DESC
  LIMIT p_limit;
END;
$$;