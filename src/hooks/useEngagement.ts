import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DailyPrompt {
  id: string;
  prompt_text: string;
  category: string;
  difficulty_level: string;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_days_active: number;
  last_interaction_date: string | null;
}

export const useEngagement = (userId?: string, companionId?: string) => {
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDailyPrompt = useCallback(async () => {
    try {
      // Get a random daily prompt
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .order('usage_count', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDailyPrompt(data);
        
        // Increment usage count
        await supabase
          .from('daily_prompts')
          .update({ usage_count: (data.usage_count || 0) + 1 })
          .eq('id', data.id);
      }
    } catch (error) {
      console.error('Error fetching daily prompt:', error);
    }
  }, []);

  const fetchStreakData = useCallback(async () => {
    if (!userId || !companionId) return;

    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('companion_id', companionId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setStreakData({
          current_streak: data.current_streak || 0,
          longest_streak: data.longest_streak || 0,
          total_days_active: data.total_days_active || 0,
          last_interaction_date: data.last_interaction_date
        });
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    }
  }, [userId, companionId]);

  const updateStreak = useCallback(async () => {
    if (!userId || !companionId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('update_user_streak', {
        p_user_id: userId,
        p_companion_id: companionId
      });

      if (error) throw error;

      if (data && data[0]) {
        const result = data[0];
        
        // Refresh streak data
        await fetchStreakData();

        // Show notifications
        if (result.streak_broken) {
          toast({
            title: "💔 Streak Reset",
            description: "Your streak was broken. Start a new one today!",
            duration: 4000,
          });
        } else if (result.new_record) {
          toast({
            title: "🏆 New Record!",
            description: `Amazing! You've reached a ${result.current_streak}-day streak!`,
            duration: 5000,
          });
        } else if (result.current_streak > 1) {
          toast({
            title: `🔥 ${result.current_streak} Day Streak!`,
            description: "Keep it going! Come back tomorrow.",
            duration: 3000,
          });
        }

        return result;
      }
    } catch (error) {
      console.error('Error updating streak:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, companionId, fetchStreakData, toast]);

  useEffect(() => {
    fetchDailyPrompt();
    if (userId && companionId) {
      fetchStreakData();
    }
  }, [userId, companionId, fetchDailyPrompt, fetchStreakData]);

  return {
    dailyPrompt,
    streakData,
    isLoading,
    fetchDailyPrompt,
    updateStreak,
    fetchStreakData
  };
};
