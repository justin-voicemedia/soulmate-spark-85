import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation, companionName, userName } = await req.json();
    
    if (!conversation || conversation.length === 0) {
      return new Response(JSON.stringify({ error: 'No conversation provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Create conversation text from messages
    const conversationText = conversation
      .map((msg: any) => `${msg.role === 'user' ? userName || 'User' : companionName || 'Companion'}: ${msg.content}`)
      .join('\n');

    console.log('Summarizing conversation:', { length: conversationText.length });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a memory assistant for an AI companion system. Your job is to summarize conversations and extract important information that the AI companion should remember for future interactions.

Create a structured summary that includes:

1. **Key Topics Discussed**: Main subjects of conversation
2. **Emotional State**: How the user was feeling during the conversation
3. **Important Personal Info**: Any personal details, preferences, or experiences shared
4. **Relationship Development**: How the relationship between user and companion evolved
5. **Future References**: Things to remember for next conversations
6. **Important Dates/Events**: Any mentioned dates, events, or milestones

Format the response as a JSON object with these fields:
- summary: Brief overall summary (2-3 sentences)
- keyTopics: Array of main topics discussed
- emotionalState: User's emotional state during conversation
- personalInfo: Array of personal details learned about the user
- relationshipNotes: Notes about relationship development
- futureReferences: Array of things to remember for future
- importantDates: Array of any dates or events mentioned
- mood: Overall mood of the conversation (positive/negative/neutral)

Be concise but capture the essence of what would be important for maintaining relationship continuity.`
          },
          {
            role: 'user',
            content: `Please summarize this conversation between ${userName || 'the user'} and ${companionName || 'the AI companion'}:\n\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summaryContent = data.choices[0].message.content;

    console.log('Raw summary from OpenAI:', summaryContent);

    // Try to parse as JSON, fallback to text format if needed
    let memorySummary;
    try {
      memorySummary = JSON.parse(summaryContent);
    } catch (parseError) {
      console.log('Failed to parse as JSON, creating structured format:', parseError);
      memorySummary = {
        summary: summaryContent,
        keyTopics: [],
        emotionalState: 'unknown',
        personalInfo: [],
        relationshipNotes: '',
        futureReferences: [],
        importantDates: [],
        mood: 'neutral',
        timestamp: new Date().toISOString()
      };
    }

    // Add timestamp if not present
    if (!memorySummary.timestamp) {
      memorySummary.timestamp = new Date().toISOString();
    }

    console.log('Final memory summary:', memorySummary);

    return new Response(JSON.stringify({ memorySummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in conversation summarizer:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});