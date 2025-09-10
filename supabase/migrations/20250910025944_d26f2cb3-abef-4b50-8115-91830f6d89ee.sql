-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create companions table for AI companion profiles
CREATE TABLE public.companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  bio TEXT NOT NULL,
  hobbies TEXT[] DEFAULT '{}',
  personality TEXT[] DEFAULT '{}',
  likes TEXT[] DEFAULT '{}',
  dislikes TEXT[] DEFAULT '{}',
  image_url TEXT,
  location TEXT,
  is_prebuilt BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_companions table to track user selections and customizations
CREATE TABLE public.user_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  companion_id UUID REFERENCES public.companions(id) ON DELETE CASCADE NOT NULL,
  custom_memories JSONB DEFAULT '{}',
  conversation_history JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table for payment tracking
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'active',
  spicy_unlocked BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create policies for companions (publicly readable prebuilt ones)
CREATE POLICY "Anyone can view prebuilt companions" ON public.companions
FOR SELECT USING (is_prebuilt = true);

CREATE POLICY "Service can manage companions" ON public.companions
FOR ALL USING (true);

-- Create policies for user_companions
CREATE POLICY "Users can view own companions" ON public.user_companions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own companions" ON public.user_companions
FOR ALL USING (user_id = auth.uid());

-- Create policies for subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can manage subscriptions" ON public.subscriptions
FOR ALL USING (true);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert prebuilt companions
INSERT INTO public.companions (name, age, gender, bio, hobbies, personality, likes, dislikes, image_url, location, is_prebuilt) VALUES
('Emma', 28, 'Female', 'Hi, I''m Emma! I''m passionate about art, literature, and deep conversations. I love exploring new ideas and helping others discover their creative side.', '{"Painting", "Reading", "Yoga", "Cooking"}', '{"Creative", "Thoughtful", "Caring", "Intelligent"}', '{"Poetry", "Museums", "Coffee shops", "Nature walks"}', '{"Loud crowds", "Negativity", "Rush"}', 'https://images.unsplash.com/photo-1494790108755-2616c14952f4?w=400&h=400&fit=crop&crop=face', 'San Francisco, CA', true),
('Alex', 32, 'Male', 'Adventure seeker and tech enthusiast. I''m Alex, and I believe life is about experiencing new things and pushing boundaries. Let''s explore together!', '{"Hiking", "Photography", "Gaming", "Travel"}', '{"Adventurous", "Confident", "Funny", "Energetic"}', '{"Mountain climbing", "New technologies", "Good coffee", "Road trips"}', '{"Boring routines", "Closed minds", "Pessimism"}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', 'Denver, CO', true),
('Sophie', 26, 'Female', 'Wellness coach and mindfulness advocate. I''m Sophie, here to help you find balance and inner peace through our conversations.', '{"Meditation", "Yoga", "Reading", "Dancing"}', '{"Calm", "Caring", "Gentle", "Thoughtful"}', '{"Sunrise meditation", "Herbal tea", "Self-improvement", "Nature"}', '{"Stress", "Negativity", "Chaos"}', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', 'Portland, OR', true),
('Marcus', 35, 'Male', 'Intellectual with a passion for philosophy and deep discussions. I''m Marcus, and I enjoy exploring life''s big questions and meaningful connections.', '{"Reading", "Chess", "Writing", "Classical music"}', '{"Intelligent", "Thoughtful", "Loyal", "Gentle"}', '{"Philosophy books", "Quiet evenings", "Deep conversations", "Museums"}', '{"Small talk", "Dishonesty", "Superficiality"}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face', 'Boston, MA', true),
('Zoe', 24, 'Female', 'Creative soul with a love for music and spontaneous adventures. I''m Zoe, and I believe every day should have a little magic in it!', '{"Music", "Art", "Dancing", "Travel"}', '{"Creative", "Spontaneous", "Energetic", "Funny"}', '{"Live concerts", "Street art", "Vintage shops", "Late night conversations"}', '{"Rigid schedules", "Judgmental people", "Boredom"}', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face', 'Austin, TX', true),
('David', 29, 'Male', 'Fitness enthusiast and motivational spirit. I''m David, here to inspire and support you in achieving your goals, whatever they may be.', '{"Fitness", "Cooking", "Sports", "Hiking"}', '{"Energetic", "Confident", "Caring", "Loyal"}', '{"Morning workouts", "Healthy cooking", "Team sports", "Personal growth"}', '{"Excuses", "Unhealthy habits", "Negativity"}', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face', 'Miami, FL', true);