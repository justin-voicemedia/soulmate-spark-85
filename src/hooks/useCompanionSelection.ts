import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useCompanionSelection = () => {
  const { user } = useAuth();
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy'); // Default to Rachel
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  const selectCompanion = async (companionId: string, voiceId?: string, relationshipType?: string) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setIsCreatingAgent(true);
    
    try {
      // Update or create user companion relationship
      // Check if relationship exists
      const { data: existingRelation } = await supabase
        .from('user_companions')
        .select('*')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      if (existingRelation) {
        // Update existing relationship
        const { error } = await supabase
          .from('user_companions')
          .update({
            voice_id: voiceId || selectedVoice,
            relationship_type: relationshipType || 'casual_friend',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRelation.id);

        if (error) throw error;
      } else {
        // Create new relationship
        const { error } = await supabase
          .from('user_companions')
          .insert({
            user_id: user.id,
            companion_id: companionId,
            voice_id: voiceId || selectedVoice || 'alloy',
            relationship_type: relationshipType || 'casual_friend'
          });

        if (error) throw error;
      }

      setSelectedCompanion(companionId);
      if (voiceId) {
        setSelectedVoice(voiceId);
      }
      toast.success('Companion selected successfully');
      
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
      // Update voice in user companion relationship
      const { error } = await supabase
        .from('user_companions')
        .update({ 
          voice_id: voiceId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('companion_id', selectedCompanion);

      if (error) throw error;

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