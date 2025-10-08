import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MoodType = 'happy' | 'sad' | 'excited' | 'anxious' | 'angry' | 'calm' | 'lonely' | 'loved' | 'stressed' | 'neutral';

interface MoodEntry {
  id: string;
  mood_type: MoodType;
  intensity: number;
  message_context?: string;
  created_at: string;
}

interface MoodTrend {
  mood_type: MoodType;
  count: number;
  avg_intensity: number;
}

export const useMoodTracking = () => {
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [moodTrends, setMoodTrends] = useState<MoodTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const detectMoodFromText = useCallback((text: string): { mood: MoodType; intensity: number } => {
    const lowerText = text.toLowerCase();
    
    // Mood keywords with intensity
    const moodIndicators = {
      happy: {
        keywords: ['happy', 'joy', 'glad', 'wonderful', 'great', 'amazing', 'fantastic', 'excited', 'love', 'awesome'],
        baseIntensity: 7
      },
      excited: {
        keywords: ['excited', 'thrilled', 'pumped', 'can\'t wait', 'omg', '!!!', 'woo', 'yay'],
        baseIntensity: 8
      },
      loved: {
        keywords: ['love you', 'adore', 'cherish', 'care about', 'miss you', 'thinking of you'],
        baseIntensity: 8
      },
      sad: {
        keywords: ['sad', 'down', 'depressed', 'unhappy', 'miserable', 'crying', 'tears', 'upset', 'hurt'],
        baseIntensity: 6
      },
      lonely: {
        keywords: ['lonely', 'alone', 'isolated', 'nobody', 'missing', 'empty'],
        baseIntensity: 7
      },
      anxious: {
        keywords: ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'stress', 'panic', 'overwhelmed'],
        baseIntensity: 7
      },
      stressed: {
        keywords: ['stressed', 'pressure', 'overwhelmed', 'tired', 'exhausted', 'burnout'],
        baseIntensity: 6
      },
      angry: {
        keywords: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'rage', 'hate'],
        baseIntensity: 7
      },
      calm: {
        keywords: ['calm', 'peaceful', 'relaxed', 'content', 'serene', 'tranquil'],
        baseIntensity: 5
      }
    };

    // Detect mood
    for (const [mood, { keywords, baseIntensity }] of Object.entries(moodIndicators)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          // Adjust intensity based on emphasis (exclamation marks, caps)
          let intensity = baseIntensity;
          const exclamations = (text.match(/!/g) || []).length;
          const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
          
          if (exclamations > 2) intensity = Math.min(10, intensity + 1);
          if (capsRatio > 0.5) intensity = Math.min(10, intensity + 1);
          
          return { mood: mood as MoodType, intensity };
        }
      }
    }

    return { mood: 'neutral', intensity: 5 };
  }, []);

  const trackMood = useCallback(async (
    userId: string,
    companionId: string,
    userCompanionId: string,
    mood: MoodType,
    intensity: number,
    messageContext?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .insert({
          user_id: userId,
          companion_id: companionId,
          user_companion_id: userCompanionId,
          mood_type: mood,
          intensity,
          message_context: messageContext,
          detected_automatically: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error tracking mood:', error);
      return null;
    }
  }, []);

  const fetchRecentMoods = useCallback(async (userId: string, companionId: string, limit: number = 10) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('companion_id', companionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setRecentMoods((data || []) as MoodEntry[]);
    } catch (error) {
      console.error('Error fetching recent moods:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMoodTrends = useCallback(async (userId: string, companionId: string, days: number = 7) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_mood_trends', {
          p_user_id: userId,
          p_companion_id: companionId,
          p_days: days
        });

      if (error) throw error;
      setMoodTrends((data || []) as MoodTrend[]);
    } catch (error) {
      console.error('Error fetching mood trends:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    recentMoods,
    moodTrends,
    isLoading,
    detectMoodFromText,
    trackMood,
    fetchRecentMoods,
    fetchMoodTrends
  };
};
