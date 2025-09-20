import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, upgrade",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    // Get voice and companion name from query params
    const url = new URL(req.url);
    const voiceId = url.searchParams.get("voice") || "alloy";
    const companionName = url.searchParams.get("companionName") || "your companion";

    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let openAISocket: WebSocket | null = null;
    let audioChunks: string[] = [];

    socket.onopen = () => {
      console.log("Client WebSocket connected for voice preview");
      
      // Connect to OpenAI Realtime API
      const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAIApiKey) {
        socket.send(JSON.stringify({ type: "error", message: "OpenAI API key not configured" }));
        return;
      }

      try {
        console.log("Connecting to OpenAI Realtime API for voice preview...");
        
        // Connect to OpenAI Realtime API using subprotocols (Deno cannot set custom headers)
        const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
        openAISocket = new WebSocket(wsUrl, [
          "realtime",
          `openai-insecure-api-key.${openAIApiKey}`,
          "openai-beta.realtime-v1"
        ]);

        openAISocket.onopen = () => {
          console.log("Connected to OpenAI Realtime API for preview");
          
          // Send session configuration
          const sessionConfig = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: `You are ${companionName}. Say exactly: "Hi, I am ${companionName}. It's nice to talk to you today, how may I help you?" Then stop talking.`,
              voice: voiceId,
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.8,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
              },
              temperature: 0.8,
              max_response_output_tokens: 100
            }
          };
          
          openAISocket?.send(JSON.stringify(sessionConfig));
          
          // Trigger response generation immediately
          setTimeout(() => {
            openAISocket?.send(JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: "Please introduce yourself now."
                  }
                ]
              }
            }));
            
            openAISocket?.send(JSON.stringify({
              type: "response.create"
            }));
          }, 1000);
        };

        openAISocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("OpenAI message type:", data.type);
          
          if (data.type === 'response.audio.delta') {
            // Accumulate audio chunks
            audioChunks.push(data.delta);
            socket.send(JSON.stringify({ 
              type: "audio_chunk", 
              data: data.delta 
            }));
          } else if (data.type === 'response.audio.done') {
            console.log("Audio generation complete, total chunks:", audioChunks.length);
            socket.send(JSON.stringify({ 
              type: "audio_complete"
            }));
          } else if (data.type === 'response.done') {
            console.log("Response complete");
            socket.send(JSON.stringify({ 
              type: "preview_complete"
            }));
          } else if (data.type === 'error') {
            console.error("OpenAI error:", data);
            socket.send(JSON.stringify({ 
              type: "error", 
              message: data.error?.message || "OpenAI error"
            }));
          }
        };

        openAISocket.onclose = (event) => {
          console.log("OpenAI WebSocket closed:", event.code, event.reason);
          socket.send(JSON.stringify({ 
            type: "connection_closed"
          }));
        };

        openAISocket.onerror = (error) => {
          console.error("OpenAI WebSocket error:", error);
          socket.send(JSON.stringify({ 
            type: "error", 
            message: "Failed to connect to OpenAI"
          }));
        };

      } catch (error) {
        console.error("Failed to connect to OpenAI:", error);
        socket.send(JSON.stringify({ type: "error", message: "Failed to connect to OpenAI" }));
      }
    };

    socket.onclose = () => {
      console.log("Client WebSocket disconnected");
      if (openAISocket) {
        openAISocket.close();
      }
    };

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
    };

    return response;

  } catch (error) {
    console.error("WebSocket setup error:", error);
    return new Response("WebSocket setup failed", { status: 500 });
  }
});