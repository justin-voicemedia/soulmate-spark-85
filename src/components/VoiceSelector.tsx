import React, { useState, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Volume2, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

// Audio queue class for handling sequential audio playback
class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    // Convert bytes to 16-bit samples
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header parameters
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    // Combine header and data
    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = this.createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      this.playNext(); // Continue with next segment even if current fails
    }
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
  }
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
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Update to valid voice if needed
  React.useEffect(() => {
    if (value !== validVoiceId) {
      onValueChange(validVoiceId);
    }
  }, [value, validVoiceId, onValueChange]);

  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = new AudioQueue(audioContextRef.current);
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const playVoicePreview = async (voiceId: string) => {
    if (isPlaying) return;
    
    try {
      setIsPlaying(true);
      await initializeAudioContext();
      
      // Clear any existing audio queue
      audioQueueRef.current?.clear();
      
      // Connect to WebSocket edge function
      const wsUrl = `wss://rugoqenajhbjqcmrplac.functions.supabase.co/realtime-voice-preview?voice=${voiceId}&companionName=${encodeURIComponent(companionName)}`;
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        console.log('Connected to voice preview WebSocket');
      };
      
      websocketRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'audio_chunk' && data.data) {
          // Convert base64 to Uint8Array
          const binaryString = atob(data.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Add to audio queue for sequential playback
          await audioQueueRef.current?.addToQueue(bytes);
        } else if (data.type === 'preview_complete') {
          console.log('Voice preview complete');
          setIsPlaying(false);
          websocketRef.current?.close();
        } else if (data.type === 'error') {
          console.error('Voice preview error:', data.message);
          toast({
            title: "Error",
            description: `Failed to generate voice preview: ${data.message}`,
            variant: "destructive",
          });
          setIsPlaying(false);
          websocketRef.current?.close();
        }
      };
      
      websocketRef.current.onclose = () => {
        setIsPlaying(false);
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Error",
          description: "Failed to connect for voice preview",
          variant: "destructive",
        });
        setIsPlaying(false);
      };
      
    } catch (error) {
      console.error('Error starting voice preview:', error);
      toast({
        title: "Error",
        description: "Failed to start voice preview",
        variant: "destructive",
      });
      setIsPlaying(false);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      websocketRef.current?.close();
      audioContextRef.current?.close();
    };
  }, []);

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
            disabled={isPlaying || disabled}
            className="flex items-center gap-2"
          >
            {isPlaying ? (
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
          Click Preview to hear "{selectedVoice.name}" introduce themselves as {companionName}
        </p>
      )}
    </div>
  );
};