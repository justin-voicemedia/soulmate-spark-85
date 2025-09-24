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
            content: `You are a memory assistant for an AI companion system. Your job is to summarize conversations and extract important structured information that the AI companion should remember for future interactions.

Create a detailed summary that extracts:

1. **Key Topics**: Main conversation subjects
2. **Emotional State**: User's feelings during the conversation  
3. **Personal Information**: Names of family/friends, pets, work details, hobbies, preferences
4. **Important Dates**: Birthdays, anniversaries, events, deadlines
5. **Structured Personal Data**: Extract specific categories of information
6. **Future References**: Things to remember for next conversations

Format the response as a JSON object with these fields:
- summary: Brief overall summary (2-3 sentences)
- keyTopics: Array of main topics discussed
- emotionalState: User's emotional state during conversation
- personalInfo: Array of personal details learned about the user
- relationshipNotes: Notes about relationship development
- futureReferences: Array of things to remember for future
- importantDates: Array of any dates or events mentioned (format as "YYYY-MM-DD: description")
- mood: Overall mood (positive/negative/neutral)
- structuredData: Object with categorized information:
  {
    "familyMembers": [{"name": "string", "relationship": "string", "notes": "string"}],
    "pets": [{"name": "string", "type": "string", "notes": "string"}],
    "workInfo": {"company": "string", "position": "string", "industry": "string"},
    "preferences": {"food": ["string"], "activities": ["string"], "places": ["string"]},
    "basicInfo": {"fullName": "string", "nickname": "string", "location": "string"}
  }

Extract specific names, relationships, and details. Be thorough in identifying personal information that helps build a comprehensive profile.`
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

    // Try to parse as JSON, handling markdown code blocks
    let memorySummary;
    try {
      // Clean up markdown code blocks and extra whitespace
      let cleanContent = summaryContent.trim();
      
      // Remove markdown JSON code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('Cleaned content for parsing:', cleanContent.substring(0, 200) + '...');
      
      memorySummary = JSON.parse(cleanContent);
      console.log('Successfully parsed JSON summary');
    } catch (parseError) {
      console.log('Failed to parse as JSON, creating structured format:', parseError);
      console.log('Original content:', summaryContent.substring(0, 500));
      
      memorySummary = {
        summary: summaryContent,
        keyTopics: [],
        emotionalState: 'unknown',
        personalInfo: [],
        relationshipNotes: '',
        futureReferences: [],
        importantDates: [],
        mood: 'neutral',
        structuredData: {
          familyMembers: [],
          pets: [],
          workInfo: {},
          preferences: { food: [], activities: [], places: [] },
          basicInfo: {}
        },
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