import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Volume2, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AVAILABLE_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Balanced and natural', gender: 'Female' },
  { id: 'ash', name: 'Ash', description: 'Calm and conversational', gender: 'Male' },
  { id: 'ballad', name: 'Ballad', description: 'Warm and expressive', gender: 'Female' },
  { id: 'coral', name: 'Coral', description: 'Friendly and bright', gender: 'Female' },
  { id: 'echo', name: 'Echo', description: 'Clear and articulate', gender: 'Male' },
  { id: 'sage', name: 'Sage', description: 'Confident and steady', gender: 'Male' },
  { id: 'shimmer', name: 'Shimmer', description: 'Gentle and soothing', gender: 'Female' },
  { id: 'verse', name: 'Verse', description: 'Engaging and upbeat', gender: 'Female' },
  { id: 'marin', name: 'Marin', description: 'Natural and conversational', gender: 'Female' },
  { id: 'cedar', name: 'Cedar', description: 'Warm and articulate', gender: 'Male' }
];

interface VoiceSelectorProps {
  value: string;
  onValueChange: (voiceId: string) => void;
  disabled?: boolean;
  companionName?: string;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  value, 
  onValueChange, 
  disabled = false,
  companionName = "your companion"
}) => {
  const selectedVoice = AVAILABLE_VOICES.find(voice => voice.id === value);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const { toast } = useToast();

  const playVoicePreview = async (voiceId: string) => {
    if (playingVoice) return; // Prevent multiple simultaneous plays
    
    setPlayingVoice(voiceId);
    
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: `Hi, I'm ${companionName}. So happy to meet you!`,
          voice: voiceId 
        }
      });

      if (error) throw error;

      // Create audio element and play
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      await audio.play();
      
      // Wait for audio to finish
      audio.onended = () => setPlayingVoice(null);
      audio.onerror = () => setPlayingVoice(null);
      
    } catch (error) {
      console.error('Error playing voice preview:', error);
      toast({
        title: "Error",
        description: "Failed to play voice preview",
        variant: "destructive",
      });
      setPlayingVoice(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="voice-selector" className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        Voice Selection
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="voice-selector">
          <SelectValue placeholder="Select a voice">
            {selectedVoice && `${selectedVoice.name} (${selectedVoice.gender}) - ${selectedVoice.description}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_VOICES.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <div className="font-medium">{voice.name} ({voice.gender})</div>
                  <div className="text-sm text-muted-foreground">{voice.description}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-8 w-8 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    playVoicePreview(voice.id);
                  }}
                  disabled={playingVoice !== null}
                >
                  {playingVoice === voice.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};