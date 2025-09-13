import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VoiceWidgetProps {
  companionId: string;
  companionName: string;
  companionImage?: string;
}

interface VapiResponse {
  call?: {
    id: string;
    status: string;
  };
}

export const VoiceWidget: React.FC<VoiceWidgetProps> = ({ 
  companionId, 
  companionName,
  companionImage 
}) => {
  const { user } = useAuth();
  const [companionVoice, setCompanionVoice] = useState<string>('alloy');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const sessionStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const vapiInstance = useRef<any>(null);

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
          setCompanionVoice(data.voice_id);
        }
      } catch (error) {
        console.error('Error loading companion voice:', error);
      }
    };
    
    loadCompanionVoice();
  }, [user, companionId]);

  // Initialize Vapi
  useEffect(() => {
    const initVapi = async () => {
      if (typeof window !== 'undefined' && !vapiInstance.current) {
        try {
          // Dynamically import Vapi
          const { default: Vapi } = await import('@vapi-ai/web');
          const { data } = await supabase.functions.invoke('get-vapi-config');
          
          if (data?.publicKey) {
            vapiInstance.current = new Vapi(data.publicKey);
            
            vapiInstance.current.on('call-start', () => {
              console.log('Call started');
              setIsConnected(true);
              startSession();
            });
            
            vapiInstance.current.on('call-end', () => {
              console.log('Call ended');
              setIsConnected(false);
              endSession();
            });
            
            vapiInstance.current.on('error', (error: any) => {
              console.error('Vapi error:', error);
              toast.error('Voice call error occurred');
              setIsConnected(false);
              setIsLoading(false);
            });
          }
        } catch (error) {
          console.error('Failed to initialize Vapi:', error);
          toast.error('Failed to initialize voice system');
        }
      }
    };

    initVapi();

    return () => {
      if (vapiInstance.current) {
        vapiInstance.current.stop();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const startSession = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('track-usage', {
        body: {
          action: 'start',
          companionId,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      setCurrentSessionId(data.sessionId);
      sessionStartTime.current = new Date();
      setSessionDuration(0);
      
      // Start duration counter
      durationInterval.current = setInterval(() => {
        if (sessionStartTime.current) {
          const elapsed = Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000);
          setSessionDuration(elapsed);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Failed to start voice session');
    }
  };

  const endSession = async () => {
    if (!currentSessionId || !user) return;
    
    try {
      const minutes = Math.ceil(sessionDuration / 60);
      
      await supabase.functions.invoke('track-usage', {
        body: {
          action: 'end',
          sessionId: currentSessionId,
          minutesUsed: minutes,
          userId: user.id
        }
      });
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      
      sessionStartTime.current = null;
      setCurrentSessionId(null);
      setSessionDuration(0);
      
      toast.success(`Session ended. Used ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end voice session');
    }
  };

  const startCall = async () => {
    if (!vapiInstance.current || !user) return;
    
    setIsLoading(true);
    
    try {
      // Get or create Vapi agent for this user-companion pair
      const { data: agentData, error: agentError } = await supabase.functions.invoke('create-vapi-agent', {
        body: { 
          companionId,
          voiceId: companionVoice 
        }
      });
      
      if (agentError || !agentData?.agentId) {
        throw new Error('Failed to get companion agent');
      }

      // Start call with the specific agent ID
      await vapiInstance.current.start(agentData.agentId);
      
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start voice call');
      setIsLoading(false);
    }
  };

  const endCall = async () => {
    if (!vapiInstance.current) return;
    
    try {
      await vapiInstance.current.stop();
    } catch (error) {
      console.error('Failed to end call:', error);
      toast.error('Failed to end voice call');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    <div className="flex flex-col items-center space-y-6">
      {/* Companion Image - Large and Above Widget */}
      {companionImage && (
        <div className="relative">
          <img 
            src={companionImage} 
            alt={companionName}
            className="w-48 h-48 rounded-full object-cover object-top border-4 border-primary/30 shadow-lg"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companionName}`;
            }}
          />
          {isConnected && (
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse shadow-lg"></div>
          )}
          {isConnected && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2">
              <Phone className="h-4 w-4" />
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
        
        {isConnected && (
          <div className="space-y-2">
            <Badge variant="default" className="animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Connected
            </Badge>
            <p className="text-sm text-muted-foreground">
              Duration: {formatDuration(sessionDuration)}
            </p>
          </div>
        )}
        
        <div className="flex justify-center space-x-3">
          {!isConnected ? (
            <Button
              onClick={startCall}
              disabled={isLoading}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
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
    </div>
  );
};