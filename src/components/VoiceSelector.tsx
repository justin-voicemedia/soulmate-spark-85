import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Volume2, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AVAILABLE_VOICES = [
  // Female Voices
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Warm and expressive American female', gender: 'Female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Clear and professional American female', gender: 'Female' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Elegant British female', gender: 'Female' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Youthful and energetic female', gender: 'Female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Sophisticated and articulate female', gender: 'Female' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Friendly and approachable female', gender: 'Female' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Gentle and soothing female', gender: 'Female' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', description: 'Calm and peaceful female', gender: 'Female' },
  
  // Male Voices  
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Deep and authoritative American male', gender: 'Male' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual and friendly male', gender: 'Male' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Distinguished British male', gender: 'Male' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Young and energetic male', gender: 'Male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Confident and clear male', gender: 'Male' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Smooth and articulate male', gender: 'Male' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Professional and reliable male', gender: 'Male' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Warm and conversational male', gender: 'Male' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Mature and trustworthy male', gender: 'Male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Versatile and expressive male', gender: 'Male' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', description: 'Experienced and wise male', gender: 'Male' }
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
  // Ensure we have a valid voice ID, fallback to 'Aria' if not supported
  const validVoiceId = AVAILABLE_VOICES.find(voice => voice.id === value) ? value : '9BWtsMINqrJLrRacOk9x';
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
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { 
          text: `Hi, I'm ${companionName}. So happy to meet you!`,
          voiceId: voiceId 
        }
      });

      console.log('TTS response:', { data, error });

      if (error) throw error;

      // Create audio element and play
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      
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
            <SelectContent className="max-h-60">
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