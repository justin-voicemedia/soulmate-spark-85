import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemoryManager } from '@/hooks/useMemoryManager';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { toast } from 'sonner';
import { RealtimeChat } from '@/utils/RealtimeWebRTC';

interface VoiceWidgetProps {
  companionId: string;
  companionName: string;
  companionImage?: string;
}

export const OpenAIVoiceWidget: React.FC<VoiceWidgetProps> = ({ companionId, companionName, companionImage }) => {
  const { user } = useAuth();
  const { getCompanionMemories, generateContextPrompt } = useMemoryManager();
  const { addMessage, forceSave } = useConversationMemory(companionId, companionName);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [companionVoice, setCompanionVoice] = useState('alloy');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const chatRef = useRef<RealtimeChat | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnStateRef = useRef<string>('new');

  // Load companion's voice setting
  useEffect(() => {
    const loadCompanionVoice = async () => {
      if (!user || !companionId) return;
      
      try {
        const { data, error } = await supabase
          .from('user_companions')
          .select('voice_id')
          .eq('user_id', user.id)
          .eq('companion_id', companionId)
          .maybeSingle();
          
        if (!error && data?.voice_id) {
          const v = data.voice_id as string;
          const allowed = ['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
          setCompanionVoice(allowed.includes(v) ? v : 'alloy');
        }
      } catch (error) {
        console.error('Error loading companion voice:', error);
      }
    };
    
    loadCompanionVoice();
  }, [user, companionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Force save any pending conversation before unmounting
      try {
        forceSave();
      } catch (e) {
        console.error('forceSave failed on unmount', e);
      }
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async () => {
    if (!user) {
      toast.error('Please sign in to use voice chat');
      return;
    }
    if (isConnecting || isConnected) return;

    console.log('Starting voice call...');
    setIsConnecting(true);
    setIsConnected(false);
    setInCall(true);

    try {
      // Start usage tracking
      const { data: startData, error: startErr } = await supabase.functions.invoke('track-usage', {
        body: {
          action: 'start',
          companionId,
          userId: user.id,
          apiType: 'voice',
        },
      });
      if (startErr) throw startErr;
      sessionIdRef.current = startData?.sessionId ?? null;

      // Get companion memories and build enhanced instructions
      const memories = await getCompanionMemories(companionId);
      const memoryContext = memories ? generateContextPrompt(memories) : '';
      
      // Build enhanced persona prompt with memory context
      let instructions = `You are ${companionName}, an AI companion. Keep responses natural and conversational (1-3 sentences). Be friendly, engaging, and stay in character.`;
      
      if (memoryContext) {
        instructions += `\n\n${memoryContext}`;
        instructions += '\n\nReference past conversations and personal details naturally. Show that you remember and care about the user.';
      }

      // Connect via WebRTC using ephemeral token
      console.log('Creating WebRTC connection...');
      chatRef.current = new RealtimeChat(handleMessage, handleConnectionStateChange);
      await chatRef.current.init(companionVoice, instructions);

      // Set connected state immediately after successful init
      console.log('WebRTC initialized successfully, setting connected state');
      setIsConnecting(false);
      setIsConnected(true);
      startSessionTracking();
      
      console.log('Voice chat fully connected - button should now show "End Call"');
    } catch (error: any) {
      console.error('Failed to start voice call:', error);
      toast.error(error?.message || 'Failed to start voice chat');
      setIsConnecting(false);
      setIsConnected(false);
      // If tracking started, end it immediately (0 minutes)
      if (sessionIdRef.current) {
        await supabase.functions.invoke('track-usage', {
          body: {
            action: 'end',
            sessionId: sessionIdRef.current,
            minutesUsed: 0,
            userId: user.id,
            apiType: 'voice',
          },
        });
        sessionIdRef.current = null;
      }
    }
  };

  const endCall = async () => {
    if (!isConnected && !isConnecting) return;

    console.log('Ending voice call...');
    
    // Stop WebRTC
    chatRef.current?.disconnect();
    chatRef.current = null;

    // Stop timers/UI
    const elapsedSeconds = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current.getTime()) / 1000)
      : 0;
    const minutesUsed = Math.max(1, Math.ceil(elapsedSeconds / 60));

    // End usage tracking
    if (sessionIdRef.current && user) {
      await supabase.functions.invoke('track-usage', {
        body: {
          action: 'end',
          sessionId: sessionIdRef.current,
          minutesUsed,
          userId: user.id,
          apiType: 'voice',
        },
      });
      sessionIdRef.current = null;
    }

    cleanup();
    toast.success('Voice chat ended');
  };

  const cleanup = () => {
    console.log('Cleaning up voice chat state...');
    setIsConnected(false);
    setIsConnecting(false);
    setInCall(false);
    setIsSpeaking(false);
    setIsListening(false);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    sessionStartTimeRef.current = null;
    setSessionDuration(0);
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

  // Handle OpenAI events from data channel
  const handleMessage = (event: any) => {
    try {
      if (event.type === 'session_ready') {
        toast.success('Voice session ready');
        console.log('Voice session is ready for conversation');
      } else if (event.type === 'response.audio.delta') {
        setIsSpeaking(true);
      } else if (event.type === 'response.audio.done') {
        setIsSpeaking(false);
      } else if (event.type === 'input_audio_buffer.speech_started') {
        setIsListening(true);
      } else if (event.type === 'input_audio_buffer.speech_stopped') {
        setIsListening(false);
      } else if (event.type === 'response.audio_transcript.delta') {
        // Track AI responses for memory
        if (event.delta) {
          // We'll collect these deltas and create complete messages
          // For now, just log that AI is responding
          console.log('AI speaking:', event.delta);
        }
      } else if (event.type === 'input_audio_buffer.transcript') {
        // Track user input for memory
        if (event.transcript) {
          addMessage('user', event.transcript);
          console.log('User said:', event.transcript);
        }
      } else if (event.type === 'response.done') {
        // When AI finishes responding, we can track the complete response
        // This would require collecting the transcript deltas above
        console.log('AI response complete');
      } else if (event.type === 'error') {
        const msg = event.message || event;
        console.error('OpenAI error:', msg);
        if (typeof msg === 'string' && msg.toLowerCase().includes('data channel closed')) {
          // Non-fatal: keep the call running, just notify
          toast.warning('Data channel closed; continuing audio');
        } else {
          toast.error(`Voice chat error: ${typeof msg === 'string' ? msg : 'Unknown error'}`);
          endCall();
        }
      }
    } catch (e) {
      console.error('Failed to process event', e);
    }
  };

  // Handle connection state changes
  const handleConnectionStateChange = (state: string) => {
    console.log('WebRTC connection state changed to:', state);
    lastConnStateRef.current = state;

    if (state === 'failed') {
      console.log('Connection failed, ending call');
      toast.error('Voice chat connection failed');
      endCall();
      return;
    }

    if (state === 'closed') {
      console.log('Connection closed, ending call');
      toast.error('Voice chat connection closed');
      endCall();
      return;
    }

    if (state === 'disconnected') {
      console.log('Transient disconnect detected; keeping call active and showing reconnecting state');
      setIsConnecting(true);
      // Do NOT auto end the call on transient disconnect
      return;
    }

    if (state === 'connected') {
      console.log('WebRTC connection established');
      setIsConnecting(false);
      setIsConnected(true);
    }
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

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Companion Image - Large and Above Widget */}
      {companionImage && (
        <div className="relative">
          <img 
            src={companionImage} 
            alt={companionName}
            className="w-48 h-48 rounded-full object-contain object-center bg-background border-4 border-primary/30 shadow-lg"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companionName}`;
            }}
          />
          {(isSpeaking || isListening) && (
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse shadow-lg"></div>
          )}
          {isSpeaking && (
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2">
              <Volume2 className="h-4 w-4" />
            </div>
          )}
          {isListening && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2">
              <Mic className="h-4 w-4" />
            </div>
          )}
        </div>
      )}

      <Card className="p-6 w-full max-w-md">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Voice Chat with {companionName}</h3>
          </div>

        <div className="space-y-2">
          {getConnectionStatusBadge()}

          {isConnected && (
            <p className="text-sm text-muted-foreground">Duration: {formatDuration(sessionDuration)}</p>
          )}

          {getStatusIndicator()}
        </div>

        <div className="flex justify-center space-x-3">
          {!inCall ? (
            <Button onClick={startCall} disabled={isConnecting} size="lg" className="bg-green-600 hover:bg-green-700">
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
            <Button onClick={endCall} size="lg" variant="destructive">
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Voice usage is billed per minute.</p>
      </div>
    </Card>
    </div>
  );
};
