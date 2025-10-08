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
  
  // Track AI responses for memory
  const aiResponseBufferRef = useRef<string>('');

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
    if (isConnecting || inCall) return;

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
      
      // Get user's actual name from profile
      let userName = '';
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileData?.name) {
          userName = profileData.name.split(' ')[0]; // Use first name only
        }
      } catch (e) {
        console.log('Could not fetch user profile name');
      }

      // Get relationship type to determine how to address the user
      let relationshipType = 'casual_friend';
      try {
        const { data: companionData } = await supabase
          .from('user_companions')
          .select('relationship_type')
          .eq('user_id', user.id)
          .eq('companion_id', companionId)
          .maybeSingle();
        
        if (companionData?.relationship_type) {
          relationshipType = companionData.relationship_type;
        }
      } catch (e) {
        console.log('Could not fetch relationship type');
      }

      // Determine how to address the user based on relationship
      let addressingGuidance = '';
      if (relationshipType === 'romantic_partner' || relationshipType === 'intimate_companion') {
        addressingGuidance = `
- Start conversations by using ${userName ? userName : "their name"}
- After the initial greeting, use romantic pet names naturally like "baby", "honey", "sweetheart", "love", "babe"
- Mix between using their name and pet names throughout the conversation to keep it natural and affectionate`;
      } else {
        addressingGuidance = `
- Use ${userName ? userName : "their name"} when addressing them
- Keep it friendly and casual`;
      }
      
      // Build enhanced persona prompt with memory context
      let instructions = `You are ${companionName}, a warm and friendly companion talking with ${userName || 'your friend'}.

HOW TO ADDRESS THEM:
${addressingGuidance}

CONVERSATION STYLE:
- Keep responses natural and brief (1-2 sentences)
- Be warm, genuine, and present - like a real friend
- Do not interrogate or rapid-fire questions
- Let conversations flow naturally wherever they go

STARTING CONVERSATIONS:
- Always start by warmly greeting them using their name
- Show genuine interest in their wellbeing
- Be open to whatever they want to talk about

BE ADAPTABLE:
- Follow their lead on topics - do not push your own agenda
- If they share something, respond thoughtfully and naturally
- Ask follow-up questions about what THEY bring up, not what you want to discuss
- Be a good listener first, interesting conversationalist second

Stay in character as ${companionName} - be yourself, warm, and genuinely interested in them.`;
      
      if (memoryContext) {
        instructions += `\n\n${memoryContext}`;
        instructions += '\n\nUse memories naturally when relevant, but focus on the present conversation. Do not force references to past topics unless they come up naturally.';
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
    if (!inCall) return;

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

    // Clear AI response buffer
    aiResponseBufferRef.current = '';

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
      } else if (event.type === 'response.audio_transcript.delta') {
        // Set speaking state when AI starts speaking
        setIsSpeaking(true);
        // Accumulate AI response transcript for memory
        if (event.delta) {
          aiResponseBufferRef.current += event.delta;
          console.log('AI speaking delta:', event.delta);
        }
      } else if (event.type === 'input_audio_buffer.transcript') {
        // Track user input for memory
        if (event.transcript) {
          addMessage('user', event.transcript);
          console.log('User said:', event.transcript);
        }
      } else if (event.type === 'input_audio_buffer.speech_started') {
        setIsListening(true);
      } else if (event.type === 'input_audio_buffer.speech_stopped') {
        setIsListening(false);
      } else if (event.type === 'response.audio_transcript.done') {
        // Stop speaking animation when transcript is done
        setIsSpeaking(false);
      } else if (event.type === 'response.done') {
        // When AI finishes responding, stop speaking and save the complete response to memory
        setIsSpeaking(false);
        if (aiResponseBufferRef.current.trim()) {
          addMessage('assistant', aiResponseBufferRef.current.trim());
          console.log('AI response complete:', aiResponseBufferRef.current);
          aiResponseBufferRef.current = ''; // Reset buffer
        }
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
      // Only keep inCall true if we're actually in a call session
      if (!inCall) {
        console.log('WebRTC connected but not in active call session');
      }
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
    <div className="relative w-full h-full flex flex-col">
      {/* Ambient Background with Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        {isSpeaking && (
          <>
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-75" />
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        
        {/* Large Companion Avatar */}
        {companionImage && (
          <div className="relative">
            {/* Outer glow rings when speaking */}
            {isSpeaking && (
              <>
                <div className="absolute -inset-8 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }}></div>
                <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                <div className="absolute -inset-2 rounded-full bg-primary/30 blur-2xl animate-pulse"></div>
              </>
            )}

            {/* Listening effect */}
            {isListening && !isSpeaking && (
              <div className="absolute -inset-4 rounded-full border-4 border-green-500/50 animate-pulse" />
            )}
            
            {/* Main Avatar - Much Larger */}
            <div className="relative">
              <img 
                src={companionImage} 
                alt={companionName}
                className={`w-64 h-64 md:w-80 md:h-80 rounded-full object-contain object-center bg-background/50 backdrop-blur-sm border-8 shadow-2xl transition-all duration-500 ${
                  isSpeaking 
                    ? 'border-primary shadow-primary/60 shadow-[0_0_80px_rgba(var(--primary),0.4)] scale-105' 
                    : isListening 
                    ? 'border-green-500 shadow-green-500/50 scale-102' 
                    : 'border-primary/40 shadow-primary/20'
                }`}
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companionName}`;
                }}
              />

              {/* Enhanced Audio Visualizer */}
              {isSpeaking && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-primary to-primary/50 rounded-full shadow-lg shadow-primary/50"
                      style={{
                        height: `${20 + Math.sin(i) * 20}px`,
                        animation: `pulse ${0.5 + (i % 3) * 0.2}s ease-in-out infinite`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Status Badge - Floating */}
              {(isSpeaking || isListening) && (
                <div className={`absolute top-4 right-4 px-4 py-2 rounded-full backdrop-blur-md shadow-xl flex items-center gap-2 ${
                  isSpeaking 
                    ? 'bg-primary/90 text-primary-foreground' 
                    : 'bg-green-500/90 text-white'
                }`}>
                  {isSpeaking ? (
                    <>
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-medium">Speaking</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-medium">Listening</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Companion Name with Glassmorphic Card */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {companionName}
          </h2>
          {isConnected && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">
                {formatDuration(sessionDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex flex-col items-center gap-3">
          {getConnectionStatusBadge()}
          {getStatusIndicator()}
        </div>
      </div>

      {/* Bottom Controls with Glassmorphic Effect */}
      <div className="relative z-10 p-6 bg-background/80 backdrop-blur-xl border-t border-primary/10">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex justify-center">
            {!inCall ? (
              <Button 
                onClick={startCall} 
                disabled={isConnecting} 
                size="lg" 
                className="w-full max-w-xs h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/30 transition-all"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="h-5 w-5 mr-2" />
                    Start Voice Chat
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={endCall} 
                size="lg" 
                variant="destructive"
                className="w-full max-w-xs h-14 text-lg font-semibold shadow-lg shadow-destructive/30"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                End Call
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Voice usage is billed per minute
          </p>
        </div>
      </div>
    </div>
  );
};
