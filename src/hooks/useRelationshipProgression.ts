import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RelationshipStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalInteractions: number;
  lastInteractionAt: string | null;
  milestones: any[];
}

export const useRelationshipProgression = () => {
  const [stats, setStats] = useState<RelationshipStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchStats = useCallback(async (userCompanionId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_companions')
        .select('relationship_level, relationship_xp, relationship_xp_to_next_level, total_interactions, last_interaction_at, relationship_milestones')
        .eq('id', userCompanionId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStats({
          level: data.relationship_level || 1,
          xp: data.relationship_xp || 0,
          xpToNextLevel: data.relationship_xp_to_next_level || 100,
          totalInteractions: data.total_interactions || 0,
          lastInteractionAt: data.last_interaction_at,
          milestones: Array.isArray(data.relationship_milestones) ? data.relationship_milestones : []
        });
      }
    } catch (error) {
      console.error('Error fetching relationship stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const awardXP = useCallback(async (userCompanionId: string, xpAmount: number = 10) => {
    try {
      const { data, error } = await supabase.rpc('add_relationship_xp', {
        p_user_companion_id: userCompanionId,
        p_xp_amount: xpAmount
      });

      if (error) throw error;

      // Refresh stats
      await fetchStats(userCompanionId);

      // Check if leveled up
      if (data && data[0]?.leveled_up) {
        toast({
          title: "🎉 Relationship Level Up!",
          description: `You've reached Level ${data[0].new_level}! Your bond grows stronger.`,
          duration: 5000,
        });
      }

      return data?.[0];
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  }, [fetchStats, toast]);

  const addMilestone = useCallback(async (userCompanionId: string, milestone: string) => {
    try {
      // Get current milestones
      const { data: current } = await supabase
        .from('user_companions')
        .select('relationship_milestones')
        .eq('id', userCompanionId)
        .maybeSingle();

      const currentMilestones = Array.isArray(current?.relationship_milestones) 
        ? current.relationship_milestones 
        : [];
      const newMilestone = {
        text: milestone,
        date: new Date().toISOString(),
        level: stats?.level || 1
      };

      // Add new milestone
      const { error } = await supabase
        .from('user_companions')
        .update({
          relationship_milestones: [...currentMilestones, newMilestone] as any
        })
        .eq('id', userCompanionId);

      if (error) throw error;

      // Refresh stats
      await fetchStats(userCompanionId);

      toast({
        title: "✨ Milestone Achieved!",
        description: milestone,
        duration: 4000,
      });
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  }, [fetchStats, stats?.level, toast]);

  return {
    stats,
    isLoading,
    fetchStats,
    awardXP,
    addMilestone
  };
};
