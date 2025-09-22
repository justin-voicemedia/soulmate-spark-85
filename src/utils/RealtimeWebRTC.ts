import { supabase } from "@/integrations/supabase/client";

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private onConnectionStateChange?: (state: string) => void;
  private keepaliveInterval?: NodeJS.Timeout;
  private sessionReady = false;
  private lastVoice: string | null = null;
  private lastInstructions: string | null = null;
  private reconnectAttempted = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(private onMessage: (message: any) => void, onConnectionStateChange?: (state: string) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.audioEl.setAttribute('playsinline', 'true');
    // Attach to DOM to help with autoplay policies
    this.audioEl.style.display = 'none';
    document.body.appendChild(this.audioEl);
    this.onConnectionStateChange = onConnectionStateChange;
  }

  async init(voice: string, instructions: string) {
    try {
      // Remember params for possible reconnect
      this.lastVoice = voice;
      this.lastInstructions = instructions;

      // Get ephemeral token from our Supabase Edge Function
      console.log('Getting ephemeral token for voice chat...');
      const { data, error } = await supabase.functions.invoke('openai-realtime-session', {
        body: { voice, instructions, model: 'gpt-4o-mini-realtime-preview-2024-12-17' }
      });

      if (error) {
        console.error('Failed to get ephemeral token:', error);
        throw new Error(`Failed to get ephemeral token: ${error.message}`);
      }

      const EPHEMERAL_KEY = data?.client_secret?.value;
      if (!EPHEMERAL_KEY) {
        console.error('No ephemeral key in response:', data);
        throw new Error('Failed to get ephemeral token from response');
      }

      console.log('Got ephemeral token, creating WebRTC connection...');

      // Create peer connection
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Monitor connection states
      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        console.log(`WebRTC connection state: ${state}`);
        this.onConnectionStateChange?.(state || 'unknown');
        if ((state === 'disconnected' || state === 'failed') && !this.reconnectAttempted) {
          console.warn('Connection lost, scheduling one reconnect attempt...');
          this.scheduleReconnect();
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc?.iceConnectionState;
        console.log(`ICE connection state: ${state}`);
      };
      this.pc.onicegatheringstatechange = () => {
        const state = this.pc?.iceGatheringState;
        console.log(`ICE gathering state changed: ${state}`);
      };
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate.candidate);
        } else {
          console.log('All ICE candidates gathered.');
        }
      };
      // Set up remote audio
      this.pc.ontrack = (e) => {
        console.log('Received remote audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      try {
        console.log('Requesting microphone access...');
         const ms = await navigator.mediaDevices.getUserMedia({ 
           audio: {
             channelCount: 1,
             echoCancellation: true,
             noiseSuppression: true,
             autoGainControl: true
           }
         });
        console.log('Got microphone access, adding tracks...');
        ms.getTracks().forEach((track) => this.pc!.addTrack(track, ms));
      } catch (micError) {
        console.error('Microphone access denied:', micError);
        throw new Error('Microphone access is required for voice chat');
      }

      // Create data channel
      console.log('Creating data channel...');
      this.dc = this.pc.createDataChannel('oai-events');
      this.attachDataChannel(this.dc);

      // Handle server-created channel
      this.pc.ondatachannel = (e) => {
        console.log('Received data channel from server:', e.channel.label);
        this.attachDataChannel(e.channel);
      };

      // Create and set local description (wait for ICE gathering to complete)
      console.log('Creating WebRTC offer...');
      const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
      await this.pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete to avoid early disconnects
      await new Promise<void>((resolve) => {
        if (this.pc!.iceGatheringState === 'complete') {
          resolve();
          return;
        }
         const check = () => {
           const state = this.pc?.iceGatheringState;
           console.log(`ICE gathering state: ${state}`);
           if (state === 'complete') {
             try { this.pc?.removeEventListener?.('icegatheringstatechange', check as any); } catch {}
             resolve();
           }
         };
         try { this.pc?.addEventListener?.('icegatheringstatechange', check as any); } catch {}
         // Fallback timeout
         setTimeout(() => {
           try {
             this.pc?.removeEventListener?.('icegatheringstatechange', check as any);
           } catch {}
           resolve();
         }, 5000);
      });

      // Connect to OpenAI's Realtime API via WebRTC
      console.log('Connecting to OpenAI Realtime API...');
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = 'gpt-4o-mini-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
        method: "POST",
        body: this.pc.localDescription?.sdp || offer.sdp!,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('OpenAI SDP exchange failed:', sdpResponse.status, errorText);
        throw new Error(`OpenAI connection failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      console.log('Setting remote description...');
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established successfully");
      
    } catch (error) {
      console.error('Error in WebRTC init:', error);
      this.onConnectionStateChange?.('failed');
      throw error;
    }
  }

  private attachDataChannel(channel: RTCDataChannel) {
    this.dc = channel;

    this.dc.onopen = () => {
      console.log('Data channel opened successfully');
      this.startKeepalive();
      this.onConnectionStateChange?.('connected');
    };

    this.dc.onclose = (event) => {
      console.log('Data channel closed:', (event as CloseEvent).code || 'unknown', (event as CloseEvent).reason || 'no reason');
      this.stopKeepalive();
      this.sessionReady = false;
      this.onConnectionStateChange?.('disconnected');
      if (!this.reconnectAttempted) {
        console.warn('Data channel closed before session ready, attempting reconnect...');
        this.scheduleReconnect();
      }
    };

    this.dc.onerror = (error) => {
      console.error('Data channel error:', error);
      this.stopKeepalive();
      this.onConnectionStateChange?.('failed');
    };

    this.dc.addEventListener('message', (e) => {
      try {
        const evt = JSON.parse(e.data);
        console.log('Received message:', evt.type);

        // After session is created, configure server VAD and audio formats
        if (evt.type === 'session.created') {
          console.log('Session created, configuring...');
          const update = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000,
                interrupt_response: true
              }
            }
          };
          try {
            this.dc?.send(JSON.stringify(update));
            console.log('Sent session.update - waiting for session.updated...');
          } catch (sendErr) {
            console.error('Failed to send session.update:', sendErr);
            this.onConnectionStateChange?.('failed');
          }
        }

        // Track when session is updated and ready
        if (evt.type === 'session.updated') {
          console.log('Session updated and ready - sending initial response.create');
          this.sessionReady = true;
          this.onMessage({ type: 'session_ready' });
          
          // Now that session is properly configured, send initial response to keep it active
          try {
            this.dc?.send(JSON.stringify({ type: 'response.create' }));
            console.log('Sent initial response.create');
          } catch (sendErr) {
            console.error('Failed to send initial response.create:', sendErr);
          }
        }

        this.onMessage(evt);
      } catch (err) {
        console.error('Failed to parse data channel message:', err, 'Raw data:', e.data);
      }
    });
  }

  private startKeepalive() {
    this.stopKeepalive();
    this.keepaliveInterval = setInterval(() => {
      if (this.dc?.readyState === 'open') {
        try {
          // Send a ping to keep connection alive
          this.dc.send(JSON.stringify({ type: 'ping' }));
          console.log('Sent keepalive ping');
        } catch (err) {
          console.warn('Keepalive ping failed:', err);
        }
      }
    }, 30000); // Every 30 seconds
  }

  private stopKeepalive() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = undefined;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempted) {
      console.log('Reconnect already attempted, skipping.');
      return;
    }
    this.reconnectAttempted = true;
    try {
      this.disconnect();
    } catch (e) {
      console.warn('Error during pre-reconnect disconnect:', e);
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.lastVoice && this.lastInstructions) {
        console.log('Attempting reconnect with stored params...');
        this.init(this.lastVoice, this.lastInstructions).catch((err) => {
          console.error('Reconnect failed:', err);
          this.onConnectionStateChange?.('failed');
        });
      } else {
        console.warn('No stored params for reconnect; giving up.');
      }
    }, 500);
  }

  sendMessage(message: string) {
    if (this.dc && this.dc.readyState === 'open' && this.sessionReady) {
      const event = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: message }]
        }
      };
      
      this.dc.send(JSON.stringify(event));
      this.dc.send(JSON.stringify({ type: 'response.create' }));
    } else {
      console.warn('Cannot send message - data channel not ready:', {
        dcState: this.dc?.readyState,
        sessionReady: this.sessionReady
      });
    }
  }

  disconnect() {
    try {
      this.stopKeepalive();
      this.dc?.close();
      this.pc?.getSenders().forEach((sender) => sender.track?.stop());
      this.pc?.close();
      // Remove audio element from DOM
      if (this.audioEl.parentNode) {
        this.audioEl.parentNode.removeChild(this.audioEl);
      }
    } catch (e) {
      console.error('Error closing WebRTC connection', e);
    } finally {
      this.dc = null;
      this.pc = null;
      this.sessionReady = false;
    }
  }
}