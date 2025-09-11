import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useCompanionSelection = () => {
  const { user } = useAuth();
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  const selectCompanion = async (companionId: string) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setIsCreatingAgent(true);
    
    try {
      // Create or get Vapi agent for this user-companion pair
      const { data, error } = await supabase.functions.invoke('create-vapi-agent', {
        body: { companionId }
      });

      if (error) {
        throw error;
      }

      setSelectedCompanion(companionId);
      toast.success(data?.message || 'Companion selected successfully');
      
    } catch (error) {
      console.error('Error selecting companion:', error);
      toast.error('Failed to select companion');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  // Load user's selected companion on mount
  useEffect(() => {
    const loadSelectedCompanion = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_companions')
          .select('companion_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setSelectedCompanion(data.companion_id);
        }
      } catch (error) {
        console.error('Error loading selected companion:', error);
      }
    };

    loadSelectedCompanion();
  }, [user]);

  return {
    selectedCompanion,
    selectCompanion,
    isCreatingAgent
  };
};