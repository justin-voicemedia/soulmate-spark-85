import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Volume2 } from 'lucide-react';

export const AVAILABLE_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Balanced and natural' },
  { id: 'ash', name: 'Ash', description: 'Calm and conversational' },
  { id: 'ballad', name: 'Ballad', description: 'Warm and expressive' },
  { id: 'coral', name: 'Coral', description: 'Friendly and bright' },
  { id: 'echo', name: 'Echo', description: 'Clear and articulate' },
  { id: 'sage', name: 'Sage', description: 'Confident and steady' },
  { id: 'shimmer', name: 'Shimmer', description: 'Gentle and soothing' },
  { id: 'verse', name: 'Verse', description: 'Engaging and upbeat' },
  { id: 'marin', name: 'Marin', description: 'Natural and conversational' },
  { id: 'cedar', name: 'Cedar', description: 'Warm and articulate' }
];

interface VoiceSelectorProps {
  value: string;
  onValueChange: (voiceId: string) => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onValueChange,
  disabled = false
}) => {
  const selectedVoice = AVAILABLE_VOICES.find(voice => voice.id === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="voice-selector" className="flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        Voice Selection
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="voice-selector">
          <SelectValue placeholder="Select a voice">
            {selectedVoice && `${selectedVoice.name} - ${selectedVoice.description}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_VOICES.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              <div>
                <div className="font-medium">{voice.name}</div>
                <div className="text-sm text-muted-foreground">{voice.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};