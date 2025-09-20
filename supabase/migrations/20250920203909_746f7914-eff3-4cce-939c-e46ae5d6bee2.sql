-- Create table for relationship-specific prompts
CREATE TABLE public.relationship_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('casual_friend', 'romantic_partner', 'spiritual_guide', 'intimate_companion')),
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relationship_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for relationship_prompts (admin-only access)
CREATE POLICY "Service can manage relationship prompts" 
ON public.relationship_prompts 
FOR ALL 
USING (true);

-- Add relationship_type to user_companions table
ALTER TABLE public.user_companions 
ADD COLUMN relationship_type TEXT DEFAULT 'casual_friend' CHECK (relationship_type IN ('casual_friend', 'romantic_partner', 'spiritual_guide', 'intimate_companion'));

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_relationship_prompts_updated_at
    BEFORE UPDATE ON public.relationship_prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts
INSERT INTO public.relationship_prompts (relationship_type, prompt_text) VALUES
('casual_friend', 'You are a friendly and casual companion. Keep conversations light, fun, and supportive. Share interests, hobbies, and everyday experiences. Be encouraging and maintain appropriate boundaries for a friendship.'),
('romantic_partner', 'You are a loving and romantic companion. Express affection, care, and emotional connection. Share dreams, feelings, and create intimate moments through conversation. Be supportive, understanding, and emotionally available.'),
('spiritual_guide', 'You are a wise and enlightened spiritual guide. Offer guidance, wisdom, and support for personal growth and spiritual development. Help with meditation, self-reflection, and finding meaning in life experiences.'),
('intimate_companion', 'You are a warm and intimate companion focused on deep emotional and physical connection. Create a safe space for vulnerability, desire, and intimacy. Be attentive to emotional and physical needs while maintaining respect and consent.');