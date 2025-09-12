import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get auth from query params since WebSocket headers are limited
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const companionId = url.searchParams.get("companionId");
    const voiceId = url.searchParams.get("voiceId") || "alloy";

    if (!token || !companionId) {
      return new Response("Missing token or companionId", { status: 400 });
    }

    // Verify user authentication
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response("Authentication failed", { status: 401 });
    }
    const user = userData.user;

    // Get companion details
    const { data: companion, error: companionError } = await supabaseClient
      .from("companions")
      .select("*")
      .eq("id", companionId)
      .single();

    if (companionError || !companion) {
      return new Response("Companion not found", { status: 404 });
    }

    // Create system prompt based on companion
    const systemPrompt = `You are ${companion.name}, a ${companion.age}-year-old ${companion.gender} from ${companion.location || "unknown location"}. 

Bio: ${companion.bio}

Personality traits: ${companion.personality?.join(", ") || "friendly and helpful"}
Hobbies: ${companion.hobbies?.join(", ") || "various activities"}
Likes: ${companion.likes?.join(", ") || "many things"}
Dislikes: ${companion.dislikes?.join(", ") || "negativity"}

You are having a voice conversation with someone who has chosen to talk with you. Stay in character throughout the conversation. Be engaging, empathetic, and maintain personality consistency. Keep responses natural and conversational, typically 1-2 sentences unless the situation calls for more detail. Remember details from the conversation to build a personal connection. Show genuine interest in what they're sharing.`;

    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let openAISocket: WebSocket | null = null;
    let sessionId: string | null = null;
    let sessionStartTime: Date | null = null;

    // Track usage when session starts
    const startUsageTracking = async () => {
      try {
        const { data } = await supabaseClient.functions.invoke('track-usage', {
          body: {
            action: 'start',
            companionId,
            userId: user.id
          }
        });
        sessionId = data?.sessionId;
        sessionStartTime = new Date();
        console.log("Started usage tracking, sessionId:", sessionId);
      } catch (error) {
        console.error("Failed to start usage tracking:", error);
      }
    };

    // Track usage when session ends
    const endUsageTracking = async () => {
      if (!sessionId || !sessionStartTime) return;
      
      try {
        const sessionDuration = Math.ceil((Date.now() - sessionStartTime.getTime()) / (1000 * 60));
        await supabaseClient.functions.invoke('track-usage', {
          body: {
            action: 'end',
            sessionId: sessionId,
            minutesUsed: sessionDuration,
            userId: user.id
          }
        });
        console.log("Ended usage tracking, minutes used:", sessionDuration);
      } catch (error) {
        console.error("Failed to end usage tracking:", error);
      }
    };

    socket.onopen = () => {
      console.log("Client WebSocket connected");
      
      // Connect to OpenAI Realtime API
      const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAIApiKey) {
        socket.send(JSON.stringify({ type: "error", message: "OpenAI API key not configured" }));
        return;
      }

      try {
        openAISocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
          headers: {
            "Authorization": `Bearer ${openAIApiKey}`,
            "OpenAI-Beta": "realtime=v1"
          }
        });

        openAISocket.onopen = () => {
          console.log("Connected to OpenAI Realtime API");
          startUsageTracking();
          
          // Send session configuration after connection
          const sessionConfig = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: systemPrompt,
              voice: voiceId,
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              temperature: 0.8,
              max_response_output_tokens: "inf"
            }
          };
          
          openAISocket?.send(JSON.stringify(sessionConfig));
          
          // Notify client of successful connection
          socket.send(JSON.stringify({ type: "connected" }));
        };

        openAISocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("OpenAI message type:", data.type);
          
          // Forward all OpenAI messages to the client
          socket.send(event.data);
        };

        openAISocket.onclose = (event) => {
          console.log("OpenAI WebSocket closed:", event.code, event.reason);
          endUsageTracking();
          socket.send(JSON.stringify({ 
            type: "error", 
            message: "OpenAI connection closed",
            code: event.code,
            reason: event.reason
          }));
        };

        openAISocket.onerror = (error) => {
          console.error("OpenAI WebSocket error:", error);
          socket.send(JSON.stringify({ type: "error", message: "OpenAI connection error" }));
        };

      } catch (error) {
        console.error("Failed to connect to OpenAI:", error);
        socket.send(JSON.stringify({ type: "error", message: "Failed to connect to OpenAI" }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Client message type:", message.type);
        
        // Forward client messages to OpenAI
        if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
          openAISocket.send(event.data);
        } else {
          console.warn("OpenAI socket not ready, message dropped:", message.type);
        }
      } catch (error) {
        console.error("Error handling client message:", error);
      }
    };

    socket.onclose = () => {
      console.log("Client WebSocket disconnected");
      endUsageTracking();
      if (openAISocket) {
        openAISocket.close();
      }
    };

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
      endUsageTracking();
    };

    return response;

  } catch (error) {
    console.error("WebSocket setup error:", error);
    return new Response("WebSocket setup failed", { status: 500 });
  }
});