import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanionImageRequest {
  name: string;
  age: number;
  gender: string;
  bio: string;
  personality: string[];
  hobbies: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const grokApiKey = Deno.env.get('GROK_API_KEY');
    if (!grokApiKey) {
      throw new Error('GROK_API_KEY not found in environment variables');
    }

    const { name, age, gender, bio, personality, hobbies }: CompanionImageRequest = await req.json();

    // Create a detailed prompt for the AI companion image
    const imagePrompt = `Professional portrait photo of ${name}, a ${age}-year-old ${gender.toLowerCase()}. ${bio.split('.')[0]}. 
    Personality traits: ${personality.slice(0, 3).join(', ')}. 
    Interests: ${hobbies.slice(0, 3).join(', ')}. 
    High quality, realistic, friendly expression, warm lighting, professional headshot style, 
    attractive, approachable, well-groomed, modern casual attire. 
    Ultra high resolution, photorealistic, detailed facial features.`;

    console.log('Generating image with prompt:', imagePrompt);

    // Generate image using Grok.ai (xAI) API
    const grokResponse = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        model: 'grok-2-image',
        n: 1,
        response_format: 'url',
      }),
    });

    if (!grokResponse.ok) {
      console.error('Grok API error:', await grokResponse.text());
      throw new Error(`Grok API error: ${grokResponse.status}`);
    }

    const grokData = await grokResponse.json();
    console.log('Grok API response:', grokData);

    // Extract image URL from Grok response
    const imageUrl = grokData.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from Grok API');
    }

    return new Response(JSON.stringify({ 
      imageUrl,
      prompt: imagePrompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error generating companion image:', error);
    
    // Fallback to a placeholder service if Grok fails
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
    
    return new Response(JSON.stringify({ 
      imageUrl: fallbackUrl,
      error: error.message,
      fallback: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 with fallback instead of failing
    });
  }
});