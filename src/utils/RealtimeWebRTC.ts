import { supabase } from "@/integrations/supabase/client";

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private onConnectionStateChange?: (state: string) => void;
  private currentVoice: string | null = null;
  private currentInstructions: string | null = null;

  constructor(private onMessage: (message: any) => void, onConnectionStateChange?: (state: string) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.onConnectionStateChange = onConnectionStateChange;
  }

  async init(voice: string, instructions: string, model = 'gpt-4o-mini-realtime-preview') {
    try {
      // Get ephemeral token from our Supabase Edge Function
      console.log('Getting ephemeral token for voice chat...');
      const { data, error } = await supabase.functions.invoke('openai-realtime-session', {
        body: { voice, instructions, model }
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

      // Cache current config for session.update
      this.currentVoice = voice;
      this.currentInstructions = instructions;

      // Create peer connection with ICE servers for better connectivity
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Monitor connection states with more detailed logging
      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        console.log(`WebRTC connection state: ${state}`);
        this.onConnectionStateChange?.(state || 'unknown');
        
        if (state === 'failed') {
          console.error('WebRTC connection failed');
          // Let UI handle via onConnectionStateChange
        } else if (state === 'disconnected') {
          console.warn('WebRTC connection disconnected');
          // Grace period handled in UI; no error event here
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc?.iceConnectionState;
        console.log(`ICE connection state: ${state}`);
        
        if (state === 'failed') {
          console.error('ICE connection failed');
          this.onMessage({ type: 'error', message: 'Network connection failed' });
        } else if (state === 'closed') {
          console.warn('ICE connection closed');
        }
      };

      this.pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state: ${this.pc?.iceGatheringState}`);
      };

      // Set up remote audio
      this.pc.ontrack = (e) => {
        console.log('Received remote audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track with better error handling
      try {
        console.log('Requesting microphone access...');
        const ms = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 24000,
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

      // Create client data channel expected by OpenAI and also listen for server-provided one
      console.log('Creating data channel and listening for server channel...');

      // Handle server-created channel if provided
      this.pc.ondatachannel = (e) => {
        console.log('Received data channel from server:', e.channel.label);
        this.attachDataChannel(e.channel);
      };

      // Proactively create client data channel
      const clientDc = this.pc.createDataChannel('oai-events');
      this.attachDataChannel(clientDc);


      // Create and set local description
      console.log('Creating WebRTC offer...');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API via WebRTC
      console.log('Connecting to OpenAI Realtime API...');
      const baseUrl = "https://api.openai.com/v1/realtime";
      const sdpResponse = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
        method: "POST",
        body: offer.sdp!,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
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
      
      // Add a timeout to detect if connection doesn't work
      setTimeout(() => {
        if (this.pc?.connectionState === 'new' || this.pc?.connectionState === 'connecting') {
          console.warn('Connection taking too long, may have failed silently');
          this.onMessage({ type: 'error', message: 'Connection timeout - please try again' });
        }
      }, 15000); // 15 second timeout

    } catch (error) {
      console.error('Error in WebRTC init:', error);
      throw error;
    }
  }

  private attachDataChannel(channel: RTCDataChannel) {
    this.dc = channel;

    this.dc.onopen = () => {
      console.log('Data channel opened successfully');
    };

    this.dc.onclose = () => {
      console.log('Data channel closed - continuing audio without DC');
      // Do not treat as fatal
    };

    this.dc.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    this.dc.addEventListener('message', (e) => {
      try {
        const evt = JSON.parse(e.data);

        // When session is created, update configuration if needed
        if (evt.type === 'session.created') {
          const update = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: this.currentInstructions || undefined,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 800,
                interrupt_response: true
              }
            }
          };
          try {
            this.dc?.send(JSON.stringify(update));
            console.log('Sent session.update');
            // Kick off initial response to keep session active
            this.dc?.send(JSON.stringify({ type: 'response.create' }));
            console.log('Sent response.create');
          } catch (sendErr) {
            console.warn('Failed to send session.update/response.create:', sendErr);
          }
        }

        this.onMessage(evt);
      } catch (err) {
        console.error('Failed to parse data channel message:', err, 'Raw data:', e.data);
      }
    });
  }

  disconnect() {
    try {
      this.dc?.close();
      this.pc?.getSenders().forEach((sender) => sender.track?.stop());
      this.pc?.close();
    } catch (e) {
      console.error('Error closing WebRTC connection', e);
    } finally {
      this.dc = null;
      this.pc = null;
    }
  }
}