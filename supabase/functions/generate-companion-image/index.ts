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
  physicalDescription?: string;
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

    const { name, age, gender, bio, physicalDescription, personality, hobbies }: CompanionImageRequest = await req.json();

    // Create a detailed prompt for ultra-realistic AI companion image
    const physicalDetails = physicalDescription ? `Physical attributes: ${physicalDescription}. ` : '';
    const imagePrompt = `Ultra-photorealistic human portrait: ${age}-year-old ${gender.toLowerCase()}, genuine human photography, not AI-generated looking. 
    ${physicalDetails}Personality: ${personality.slice(0, 2).join(', ')}. Interests: ${hobbies.slice(0, 2).join(', ')}. 
    CRITICAL: Must look like real human photography - natural skin imperfections, realistic lighting, authentic facial expressions.
    Professional headshot style, natural studio lighting, direct eye contact, genuine smile, modern casual clothing.
    Shot with high-end camera, shallow depth of field, perfect focus on eyes, natural skin texture with pores visible.
    Absolutely NO: cartoon style, anime, illustration, digital art, CGI look, artificial appearance, perfect skin.
    Must appear as authentic human photography, indistinguishable from real person photo. Hyperrealistic human only.`;

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
    
    // Fallback to realistic human placeholder if Grok fails
    const genderParam = gender.toLowerCase() === 'female' ? 'women' : 'men';
    const fallbackUrl = `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1494790108755-2616b612b786' : '1507003211169-0a1dd7228f2d'}?w=400&h=400&fit=crop&crop=face`;
    
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