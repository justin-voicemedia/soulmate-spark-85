import { supabase } from "@/integrations/supabase/client";

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;

  constructor(private onMessage: (message: any) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init(voice: string, instructions: string, model = 'gpt-4o-mini-realtime-preview') {
    // Get ephemeral token from our Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('openai-realtime-session', {
      body: { voice, instructions, model }
    });

    if (error) throw error;
    const EPHEMERAL_KEY = data?.client_secret?.value;
    if (!EPHEMERAL_KEY) throw new Error('Failed to get ephemeral token');

    // Create peer connection
    this.pc = new RTCPeerConnection();

    // Set up remote audio
    this.pc.ontrack = (e) => {
      this.audioEl.srcObject = e.streams[0];
    };

    // Add local audio track
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    ms.getTracks().forEach((track) => this.pc!.addTrack(track, ms));

    // Set up data channel
    this.dc = this.pc.createDataChannel("oai-events");
    this.dc.addEventListener("message", (e) => {
      try {
        const event = JSON.parse(e.data);
        this.onMessage(event);
      } catch (err) {
        console.error('Failed to parse data channel message', err);
      }
    });

    // Create and set local description
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Connect to OpenAI's Realtime API via WebRTC
    const baseUrl = "https://api.openai.com/v1/realtime";
    const sdpResponse = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
      method: "POST",
      body: offer.sdp!,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer" as RTCSdpType,
      sdp: await sdpResponse.text(),
    };

    await this.pc.setRemoteDescription(answer);
    console.log("WebRTC connection established");
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