import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Settings, Volume2, Heart, Brain, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { toast } from 'sonner';
import { VoiceSelector } from './VoiceSelector';
import { RelationshipSelector } from './RelationshipSelector';
import { MemoryManager } from './MemoryManager';
import { EnhancedMemoryManager } from './EnhancedMemoryManager';
import { CompanionPhotoGallery } from './CompanionPhotoGallery';
import { ConversationHistory } from './ConversationHistory';

interface CompanionSettingsProps {
  companionId: string;
  companionName: string;
  onBack: () => void;
}

interface UserCompanion {
  id: string;
  voice_id: string;
  relationship_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CompanionSettings = ({ companionId, companionName, onBack }: CompanionSettingsProps) => {
  const { user } = useAuth();
  const { trialStatus } = useTrialStatus();
  const [userCompanion, setUserCompanion] = useState<UserCompanion | null>(null);
  const [companion, setCompanion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMemoryManager, setShowMemoryManager] = useState(false);

  useEffect(() => {
    loadUserCompanion();
    loadCompanion();
  }, [companionId, user]);

  const loadCompanion = async () => {
    if (!companionId) return;
    
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('id', companionId)
        .single();

      if (error) throw error;
      setCompanion(data);
    } catch (error) {
      console.error('Error loading companion:', error);
    }
  };

  const loadUserCompanion = async () => {
    if (!user || !companionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_companions')
        .select('*')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserCompanion(data);
      } else {
        // Create a default user_companions record if it doesn't exist
        const { data: newRecord, error: insertError } = await supabase
          .from('user_companions')
          .insert({
            user_id: user.id,
            companion_id: companionId,
            voice_id: 'alloy',
            relationship_type: 'casual_friend',
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setUserCompanion(newRecord);
      }
    } catch (error) {
      console.error('Error loading user companion:', error);
      toast.error('Failed to load companion settings');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceChange = async (newVoiceId: string) => {
    if (!user || !userCompanion) return;

    try {
      const { error } = await supabase
        .from('user_companions')
        .update({
          voice_id: newVoiceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userCompanion.id);

      if (error) throw error;

      setUserCompanion(prev => prev ? { ...prev, voice_id: newVoiceId } : null);
      toast.success('Voice updated successfully');
    } catch (error) {
      console.error('Error updating voice:', error);
      toast.error('Failed to update voice');
    }
  };

  const handleRelationshipChange = async (newType: string) => {
    if (userCompanion) {
      setUserCompanion(prev => prev ? { ...prev, relationship_type: newType } : null);
      toast.success('Relationship type updated - settings will be used in new conversations');
    }
  };

  const handlePhotoUpdate = (newImageUrl: string) => {
    if (companion) {
      setCompanion({ ...companion, image_url: newImageUrl });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading companion settings...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-background to-secondary">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto space-y-6 p-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Settings for {companionName}
            </h1>
            <p className="text-muted-foreground">Customize your companion experience</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="relationship" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Relationship
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="memory" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Memory
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-6">
            {companion && (
              <CompanionPhotoGallery
                companion={companion}
                onPhotoUpdate={handlePhotoUpdate}
              />
            )}
          </TabsContent>

          <TabsContent value="relationship" className="mt-6">
            {userCompanion && (
              <RelationshipSelector
                companionId={companionId}
                companionName={companionName}
                currentRelationshipType={userCompanion.relationship_type}
                onRelationshipChange={handleRelationshipChange}
                showTitle={false}
              />
            )}
          </TabsContent>

          <TabsContent value="voice" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Voice Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose the voice for your conversations with {companionName}
                </p>
              </CardHeader>
              <CardContent>
                {userCompanion && (
                  <VoiceSelector
                    value={userCompanion.voice_id}
                    onValueChange={handleVoiceChange}
                    companionName={companionName}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="memory" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Memory Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage what {companionName} remembers about you and your conversations
                </p>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowMemoryManager(true)}>
                  <Brain className="h-4 w-4 mr-2" />
                  Open Memory Manager
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Add personal details like family members, pets, important dates, and preferences that you'd like {companionName} to remember.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {user && (
              <ConversationHistory 
                userId={user.id}
                companionId={companionId}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Enhanced Memory Manager Modal */}
        <EnhancedMemoryManager 
          companionId={companionId}
          companionName={companionName}
          isOpen={showMemoryManager}
          onClose={() => setShowMemoryManager(false)}
        />

        {/* Additional Info */}
        {trialStatus && !trialStatus.subscribed && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Settings className="h-4 w-4" />
                <span className="font-medium">Limited Features</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Some advanced settings require a subscription. Subscribe to unlock all customization options.
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </ScrollArea>
    </div>
  );
};