import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Volume2, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AVAILABLE_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Balanced and natural', gender: 'Female' },
  { id: 'echo', name: 'Echo', description: 'Clear and articulate', gender: 'Male' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic', gender: 'Male' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative', gender: 'Male' },
  { id: 'nova', name: 'Nova', description: 'Bright and energetic', gender: 'Female' },
  { id: 'shimmer', name: 'Shimmer', description: 'Gentle and soothing', gender: 'Female' }
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
  // Ensure we have a valid voice ID, fallback to 'alloy' if not supported
  const validVoiceId = AVAILABLE_VOICES.find(voice => voice.id === value) ? value : 'alloy';
  const selectedVoice = AVAILABLE_VOICES.find(voice => voice.id === validVoiceId);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const { toast } = useToast();

  // Update to valid voice if needed
  React.useEffect(() => {
    if (value !== validVoiceId) {
      onValueChange(validVoiceId);
    }
  }, [value, validVoiceId, onValueChange]);

  const playVoicePreview = async (voiceId: string) => {
    if (playingVoice) return; // Prevent multiple simultaneous plays
    
    setPlayingVoice(voiceId);
    console.log('Playing voice preview for:', voiceId, 'with name:', companionName);
    
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: `Hi, I'm ${companionName}. So happy to meet you!`,
          voice: voiceId 
        }
      });

      console.log('TTS response:', { data, error });

      if (error) throw error;

      // Create audio element and play
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      
      audio.onloadeddata = () => {
        console.log('Audio loaded, attempting to play');
        audio.play().catch(e => {
          console.error('Audio play failed:', e);
          setPlayingVoice(null);
        });
      };
      
      audio.onended = () => {
        console.log('Audio playback ended');
        setPlayingVoice(null);
      };
      
      audio.onerror = (e) => {
        console.error('Audio error:', e);
        setPlayingVoice(null);
      };
      
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
    <div className="space-y-3">
      <Label htmlFor="voice-selector" className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        Voice Selection
      </Label>
      
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Select value={validVoiceId} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger id="voice-selector">
              <SelectValue placeholder="Select a voice">
                {selectedVoice && `${selectedVoice.name} (${selectedVoice.gender}) - ${selectedVoice.description}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_VOICES.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div>
                    <div className="font-medium">{voice.name} ({voice.gender})</div>
                    <div className="text-sm text-muted-foreground">{voice.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedVoice && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => playVoicePreview(selectedVoice.id)}
            disabled={playingVoice !== null || disabled}
            className="flex items-center gap-2"
          >
            {playingVoice === selectedVoice.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Preview
          </Button>
        )}
      </div>
      
      {selectedVoice && (
        <p className="text-sm text-muted-foreground">
          Click Preview to hear "{selectedVoice.name}" say: "Hi, I'm {companionName}. So happy to meet you!"
        </p>
      )}
    </div>
  );
};