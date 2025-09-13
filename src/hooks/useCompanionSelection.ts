import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useCompanionSelection = () => {
  const { user } = useAuth();
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy'); // Default to Rachel
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  const selectCompanion = async (companionId: string, voiceId?: string) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setIsCreatingAgent(true);
    
    try {
      // Create or get Vapi agent for this user-companion pair
      const { data, error } = await supabase.functions.invoke('create-vapi-agent', {
        body: { 
          companionId,
          voiceId: voiceId || selectedVoice 
        }
      });

      if (error) {
        throw error;
      }

      setSelectedCompanion(companionId);
      if (voiceId) {
        setSelectedVoice(voiceId);
      }
      toast.success(data?.message || 'Companion selected successfully');
      
    } catch (error) {
      console.error('Error selecting companion:', error);
      toast.error('Failed to select companion');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const updateVoice = async (voiceId: string) => {
    if (!user || !selectedCompanion) {
      toast.error('Please select a companion first');
      return;
    }

    setIsCreatingAgent(true);
    
    try {
      // Update the voice for the current companion
      const { data, error } = await supabase.functions.invoke('create-vapi-agent', {
        body: { 
          companionId: selectedCompanion,
          voiceId 
        }
      });

      if (error) {
        throw error;
      }

      setSelectedVoice(voiceId);
      toast.success('Voice updated successfully');
      
    } catch (error) {
      console.error('Error updating voice:', error);
      toast.error('Failed to update voice');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  // Load user's selected companion and voice on mount
  useEffect(() => {
    const loadSelectedCompanion = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_companions')
          .select('companion_id, voice_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setSelectedCompanion(data.companion_id);
          if (data.voice_id) {
            setSelectedVoice(data.voice_id);
          }
        }
      } catch (error) {
        console.error('Error loading selected companion:', error);
      }
    };

    loadSelectedCompanion();
  }, [user]);

  return {
    selectedCompanion,
    selectedVoice,
    selectCompanion,
    updateVoice,
    isCreatingAgent
  };
};