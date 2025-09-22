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
          this.onMessage({ type: 'error', message: 'WebRTC connection failed' });
        } else if (state === 'disconnected') {
          console.warn('WebRTC connection disconnected');
          this.onMessage({ type: 'error', message: 'Connection lost' });
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

      // Prefer using server-created data channel; listen for it
      console.log('Waiting for server data channel...');
      this.pc.ondatachannel = (event) => {
        console.log('Received data channel from server:', event.channel.label);
        this.dc = event.channel;

        this.dc.onopen = () => {
          console.log('Server data channel opened');
        };
        
        this.dc.onclose = () => {
          console.log('Server data channel closed');
          this.onMessage({ type: 'error', message: 'Data channel closed unexpectedly' });
        };
        
        this.dc.onerror = (error) => {
          console.error('Data channel error:', error);
          this.onMessage({ type: 'error', message: 'Data channel error occurred' });
        };
        
        this.dc.addEventListener("message", (e) => {
          try {
            const evt = JSON.parse(e.data);

            if (evt.type === 'session.created') {
              console.log('Session created, sending session.update');
              const update = {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'],
                  instructions: this.currentInstructions || '',
                  input_audio_format: 'pcm16',
                  output_audio_format: 'pcm16',
                  input_audio_transcription: { model: 'whisper-1' },
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 800,
                  },
                },
              };
              this.dc?.send(JSON.stringify(update));
            }

            this.onMessage(evt);
          } catch (err) {
            console.error('Failed to parse data channel message:', err, 'Raw data:', e.data);
          }
        });
      };

      // Fallback: if no server channel after 5s, create one
      setTimeout(() => {
        if (!this.dc && this.pc) {
          console.warn('No server data channel received, creating client data channel');
          this.dc = this.pc.createDataChannel('oai-events');
          this.dc.onopen = () => console.log('Client data channel opened');
          this.dc.onclose = () => {
            console.log('Client data channel closed');
            this.onMessage({ type: 'error', message: 'Data channel closed' });
          };
          this.dc.onerror = (error) => {
            console.error('Client data channel error:', error);
            this.onMessage({ type: 'error', message: 'Data channel error' });
          };
          this.dc.addEventListener('message', (e) => {
            try {
              const evt = JSON.parse(e.data);

              if (evt.type === 'session.created') {
                console.log('Session created (client channel), sending session.update');
                const update = {
                  type: 'session.update',
                  session: {
                    modalities: ['text', 'audio'],
                    instructions: this.currentInstructions || '',
                    input_audio_format: 'pcm16',
                    output_audio_format: 'pcm16',
                    input_audio_transcription: { model: 'whisper-1' },
                    turn_detection: {
                      type: 'server_vad',
                      threshold: 0.5,
                      prefix_padding_ms: 300,
                      silence_duration_ms: 800,
                    },
                  },
                };
                this.dc?.send(JSON.stringify(update));
              }

              this.onMessage(evt);
            } catch (err) {
              console.error('Failed to parse data (client channel):', err);
            }
          });
        }
      }, 5000);
      // Data channel handlers are set when the channel is created (server or client)


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