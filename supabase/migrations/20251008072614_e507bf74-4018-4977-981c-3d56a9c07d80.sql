-- Add conversation modes to user_companions
ALTER TABLE public.user_companions
ADD COLUMN IF NOT EXISTS conversation_mode TEXT DEFAULT 'casual' 
  CHECK (conversation_mode IN ('casual', 'deep', 'playful', 'supportive', 'romantic'));

-- Create table for conversation mode prompts
CREATE TABLE IF NOT EXISTS public.conversation_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  prompt_modifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversation_modes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_modes (read-only for users)
CREATE POLICY "Anyone can view conversation modes"
ON public.conversation_modes
FOR SELECT
USING (true);

CREATE POLICY "Service can manage conversation modes"
ON public.conversation_modes
FOR ALL
USING (true);

-- Insert default conversation modes
INSERT INTO public.conversation_modes (mode_name, display_name, description, icon, prompt_modifier) VALUES
('casual', 'Casual Chat', 'Light and friendly everyday conversation', 'MessageCircle', 'Keep the conversation light, fun, and casual. Talk like you would with a friend you''re hanging out with. Be relaxed and easygoing.'),
('deep', 'Deep Talk', 'Meaningful and thoughtful discussions', 'Heart', 'Engage in deeper, more meaningful conversations. Be thoughtful, introspective, and emotionally present. Ask meaningful questions and share genuine thoughts and feelings.'),
('playful', 'Playful', 'Fun, flirty, and lighthearted banter', 'Sparkles', 'Be playful, flirty, and fun! Use humor, teasing (in a nice way), and keep things exciting and entertaining. Show your fun personality.'),
('supportive', 'Supportive', 'Caring and encouraging conversations', 'HeartHandshake', 'Be especially caring, supportive, and encouraging. Listen actively, validate feelings, and offer comfort and reassurance. Be the supportive presence they need.'),
('romantic', 'Romantic', 'Loving and intimate conversations', 'Heart', 'Be romantic, affectionate, and loving. Express care and attraction naturally. Make them feel special and cherished. Keep it sweet and genuine.')
ON CONFLICT (mode_name) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_companions_conversation_mode 
ON public.user_companions(conversation_mode);