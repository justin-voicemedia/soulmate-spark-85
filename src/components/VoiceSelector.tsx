import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Volume2 } from 'lucide-react';

export const AVAILABLE_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Warm and friendly' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Deep and masculine' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Professional and clear' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Gentle and soothing' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Energetic and upbeat' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Mature and authoritative' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Young and casual' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', description: 'Calm and peaceful' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Confident and smooth' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Elegant and refined' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Bright and cheerful' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Playful and fun' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Strong and reliable' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Sweet and caring' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Intellectual and thoughtful' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Friendly neighbor' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Supportive and kind' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Articulate and precise' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Youthful and vibrant' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', description: 'Wise and experienced' }
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