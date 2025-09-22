import { supabase } from "@/integrations/supabase/client";

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private onConnectionStateChange?: (state: string) => void;

  constructor(private onMessage: (message: any) => void, onConnectionStateChange?: (state: string) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.onConnectionStateChange = onConnectionStateChange;
  }

  async init(voice: string, instructions: string) {
    try {
      // Get ephemeral token from our Supabase Edge Function
      console.log('Getting ephemeral token for voice chat...');
      const { data, error } = await supabase.functions.invoke('openai-realtime-session', {
        body: { voice, instructions, model: 'gpt-4o-realtime-preview-2024-12-17' }
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
      };

      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc?.iceConnectionState;
        console.log(`ICE connection state: ${state}`);
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

      // Create data channel
      console.log('Creating data channel...');
      this.dc = this.pc.createDataChannel('oai-events');
      this.attachDataChannel(this.dc);

      // Handle server-created channel
      this.pc.ondatachannel = (e) => {
        console.log('Received data channel from server:', e.channel.label);
        this.attachDataChannel(e.channel);
      };

      // Create and set local description
      console.log('Creating WebRTC offer...');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API via WebRTC
      console.log('Connecting to OpenAI Realtime API...');
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = 'gpt-4o-realtime-preview-2024-12-17';
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
      this.onConnectionStateChange?.('connected');
    };

    this.dc.onclose = () => {
      console.log('Data channel closed');
      this.onConnectionStateChange?.('disconnected');
    };

    this.dc.onerror = (error) => {
      console.error('Data channel error:', error);
      this.onConnectionStateChange?.('failed');
    };

    this.dc.addEventListener('message', (e) => {
      try {
        const evt = JSON.parse(e.data);
        console.log('Received message:', evt.type);
        this.onMessage(evt);
      } catch (err) {
        console.error('Failed to parse data channel message:', err, 'Raw data:', e.data);
      }
    });
  }

  sendMessage(message: string) {
    if (this.dc && this.dc.readyState === 'open') {
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