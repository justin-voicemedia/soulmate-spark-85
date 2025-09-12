import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AudioRecorder, encodeAudioForAPI, playAudioData } from '@/utils/RealtimeAudio';

interface VoiceWidgetProps {
  companionId: string;
  companionName: string;
}

// OpenAI Realtime API supported voices
const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Balanced and natural' },
  { id: 'echo', name: 'Echo', description: 'Clear and articulate' },
  { id: 'fable', name: 'Fable', description: 'Expressive and warm' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Bright and energetic' },
  { id: 'shimmer', name: 'Shimmer', description: 'Gentle and soothing' }
];

export const OpenAIVoiceWidget: React.FC<VoiceWidgetProps> = ({ 
  companionId, 
  companionName 
}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const startCall = async () => {
    if (!user) {
      toast.error('Please sign in to use voice chat');
      return;
    }

    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Construct WebSocket URL with auth params
      const wsUrl = `wss://rugoqenajhbjqcmrplac.functions.supabase.co/functions/v1/openai-realtime?token=${session.access_token}&companionId=${companionId}&voiceId=${selectedVoice}`;

      console.log('Connecting to WebSocket...');
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnecting(false);
        setIsConnected(true);
        startSessionTracking();
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message type:', data.type);

          switch (data.type) {
            case 'connected':
              toast.success('Connected to voice chat');
              await startAudioRecording();
              break;

            case 'session.created':
              console.log('Session created');
              break;

            case 'response.audio.delta':
              // Play audio chunks
              if (data.delta) {
                const binaryString = atob(data.delta);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                if (audioContextRef.current) {
                  await playAudioData(audioContextRef.current, bytes);
                }
              }
              setIsSpeaking(true);
              break;

            case 'response.audio.done':
              setIsSpeaking(false);
              break;

            case 'input_audio_buffer.speech_started':
              setIsListening(true);
              break;

            case 'input_audio_buffer.speech_stopped':
              setIsListening(false);
              break;

            case 'error':
              console.error('OpenAI error:', data.message);
              toast.error(`Voice chat error: ${data.message}`);
              break;

            default:
              // Log other message types for debugging
              if (data.type !== 'response.audio_transcript.delta') {
                console.log('Unhandled message type:', data.type);
              }
              break;
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        cleanup();
        
        if (event.code !== 1000) { // 1000 is normal closure
          toast.error('Voice chat disconnected');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Failed to connect to voice chat');
        cleanup();
      };

    } catch (error) {
      console.error('Failed to start voice call:', error);
      toast.error('Failed to start voice chat');
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User ended call');
    }
    cleanup();
  };

  const cleanup = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    sessionStartTimeRef.current = null;
    setSessionDuration(0);
  };

  const startAudioRecording = async () => {
    try {
      audioRecorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });

      await audioRecorderRef.current.start();
      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const startSessionTracking = () => {
    sessionStartTimeRef.current = new Date();
    setSessionDuration(0);
    
    durationIntervalRef.current = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current.getTime()) / 1000);
        setSessionDuration(elapsed);
      }
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionStatusBadge = () => {
    if (isConnecting) {
      return (
        <Badge variant="secondary" className="animate-pulse">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
          Connecting...
        </Badge>
      );
    }
    
    if (isConnected) {
      return (
        <Badge variant="default" className="animate-pulse">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Connected
        </Badge>
      );
    }

    return null;
  };

  const getStatusIndicator = () => {
    if (isSpeaking) {
      return (
        <div className="flex items-center gap-2 text-primary">
          <Volume2 className="h-4 w-4 animate-pulse" />
          <span className="text-sm">AI Speaking...</span>
        </div>
      );
    }
    
    if (isListening) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Mic className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Listening...</span>
        </div>
      );
    }

    return null;
  };

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Please sign in to use voice chat</p>
        <Button variant="outline" disabled>
          <Mic className="h-4 w-4 mr-2" />
          Voice Chat Unavailable
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Voice Chat with {companionName}</h3>
        </div>
        
        {!isConnected && !isConnecting && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Choose Voice</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENAI_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div>
                        <div className="font-medium">{voice.name}</div>
                        <div className="text-xs text-muted-foreground">{voice.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {getConnectionStatusBadge()}
          
          {isConnected && (
            <p className="text-sm text-muted-foreground">
              Duration: {formatDuration(sessionDuration)}
            </p>
          )}
          
          {getStatusIndicator()}
        </div>
        
        <div className="flex justify-center space-x-3">
          {!isConnected ? (
            <Button
              onClick={startCall}
              disabled={isConnecting}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Start Voice Chat
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={endCall}
              size="lg"
              variant="destructive"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Voice calls are charged at $0.10 per minute
        </p>
      </div>
    </Card>
  );
};