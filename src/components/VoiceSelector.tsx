import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Volume2 } from 'lucide-react';

export const AVAILABLE_VOICES = [
  // OpenAI Realtime Voices
  { id: 'alloy', name: 'Alloy', description: 'Balanced and versatile voice', gender: 'Neutral' },
  { id: 'ash', name: 'Ash', description: 'Clear and articulate voice', gender: 'Neutral' },
  { id: 'ballad', name: 'Ballad', description: 'Melodic and expressive voice', gender: 'Female' },
  { id: 'cedar', name: 'Cedar', description: 'Rich and natural voice', gender: 'Male' },
  { id: 'coral', name: 'Coral', description: 'Warm and friendly voice', gender: 'Female' },
  { id: 'echo', name: 'Echo', description: 'Deep and resonant voice', gender: 'Male' },
  { id: 'marin', name: 'Marin', description: 'Fresh and modern voice', gender: 'Female' },
  { id: 'sage', name: 'Sage', description: 'Wise and calming voice', gender: 'Male' },
  { id: 'shimmer', name: 'Shimmer', description: 'Bright and energetic voice', gender: 'Female' },
  { id: 'verse', name: 'Verse', description: 'Smooth and conversational voice', gender: 'Male' }
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

  // Update to valid voice if needed
  React.useEffect(() => {
    if (value !== validVoiceId) {
      onValueChange(validVoiceId);
    }
  }, [value, validVoiceId, onValueChange]);

  return (
    <div className="space-y-3">
      <Label htmlFor="voice-selector" className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        Voice Selection
      </Label>
      
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
      
      {selectedVoice && (
        <p className="text-sm text-muted-foreground">
          Voice will be used in conversations with {companionName}
        </p>
      )}
    </div>
  );
};