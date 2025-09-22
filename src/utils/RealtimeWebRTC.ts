import { supabase } from "@/integrations/supabase/client";

export class RealtimeChat {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;

  constructor(
    private onMessage: (message: any) => void,
    private onConnectionStateChange?: (state: string) => void
  ) {}

  async init(voice: string, instructions: string) {
    try {
      console.log('Connecting to OpenAI Realtime API via WebSocket...');
      
      // Use the WebSocket approach through Supabase edge function
      const wsUrl = `wss://omdlkumkdntjqzjzkrbi.supabase.co/functions/v1/openai-realtime?voice=${encodeURIComponent(voice)}&instructions=${encodeURIComponent(instructions)}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.onConnectionStateChange?.('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'response.audio.delta') {
            this.handleAudioDelta(data.delta);
          } else if (data.type === 'error') {
            console.error('WebSocket error:', data.message);
            this.onMessage({ type: 'error', message: data.message });
          } else {
            this.onMessage(data);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onConnectionStateChange?.('failed');
        this.onMessage({ type: 'error', message: 'Connection failed' });
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.onConnectionStateChange?.('disconnected');
      };

      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      
    } catch (error) {
      console.error('Error initializing voice chat:', error);
      this.onConnectionStateChange?.('failed');
      throw error;
    }
  }

  private async handleAudioDelta(base64Audio: string) {
    if (!this.audioContext) return;

    try {
      // Convert base64 to array buffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM to AudioBuffer
      const audioBuffer = await this.pcmToAudioBuffer(bytes);
      this.audioQueue.push(audioBuffer);
      
      if (!this.isPlaying) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error('Error processing audio delta:', error);
    }
  }

  private async pcmToAudioBuffer(pcmData: Uint8Array): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('No audio context');

    // Convert PCM16 to Float32
    const samples = new Float32Array(pcmData.length / 2);
    const dataView = new DataView(pcmData.buffer);
    
    for (let i = 0; i < samples.length; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little endian
      samples[i] = int16 / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, samples.length, 24000);
    audioBuffer.getChannelData(0).set(samples);
    return audioBuffer;
  }

  private async playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    try {
      if (!this.audioContext) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        this.playNextAudio();
      };
      
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNextAudio(); // Continue with next chunk
    }
  }

  sendMessage(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: message }]
        }
      }));
      
      this.ws.send(JSON.stringify({ type: 'response.create' }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioQueue = [];
    this.isPlaying = false;
  }
}