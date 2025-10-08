import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  points: number;
}

export const useAchievements = (userId: string, companionId?: string) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkAndAwardAchievements = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.rpc("check_achievements", {
        p_user_id: userId,
        p_companion_id: companionId || null,
      });

      if (error) {
        console.error("Error checking achievements:", error);
        return;
      }

      if (data && data[0]?.newly_unlocked) {
        const unlocked = JSON.parse(JSON.stringify(data[0].newly_unlocked));
        if (Array.isArray(unlocked) && unlocked.length > 0) {
          setAchievements(unlocked as Achievement[]);
          
          // Show toast for each new achievement
          (unlocked as Achievement[]).forEach((ach: Achievement) => {
            toast({
              title: "🎉 Achievement Unlocked!",
              description: `${ach.icon} ${ach.title}`,
            });
          });

          return unlocked as Achievement[];
        }
      }

      return [];
    } catch (error) {
      console.error("Error in checkAndAwardAchievements:", error);
      return [];
    }
  };

  return {
    achievements,
    loading,
    checkAndAwardAchievements,
  };
};
