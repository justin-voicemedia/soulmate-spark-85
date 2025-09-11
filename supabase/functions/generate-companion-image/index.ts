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
  console.log('[GENERATE-IMAGE] Function started');
  
  if (req.method === 'OPTIONS') {
    console.log('[GENERATE-IMAGE] CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const grokApiKey = Deno.env.get('GROK_API_KEY');
    console.log('[GENERATE-IMAGE] Grok API key available:', !!grokApiKey);
    
    if (!grokApiKey) {
      console.error('[GENERATE-IMAGE] GROK_API_KEY not found in environment variables');
      throw new Error('GROK_API_KEY not found in environment variables');
    }

    const requestBody = await req.json();
    console.log('[GENERATE-IMAGE] Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { name, age, gender, bio, physicalDescription, personality, hobbies }: CompanionImageRequest = requestBody;

    // Create a detailed prompt for ultra-realistic AI companion image
    let enhancedPhysicalDescription = '';
    if (physicalDescription && physicalDescription.trim()) {
      // Always add "ultra realistic" to user's physical description
      enhancedPhysicalDescription = physicalDescription.toLowerCase().includes('ultra realistic') 
        ? physicalDescription 
        : `Ultra realistic ${physicalDescription}`;
      enhancedPhysicalDescription = `PHYSICAL DESCRIPTION: ${enhancedPhysicalDescription}. `;
      console.log('[GENERATE-IMAGE] Enhanced physical description:', enhancedPhysicalDescription);
    }
    
    // Create shorter prompt to stay under 1024 character limit
    const basePrompt = `Photorealistic ${age}-year-old ${gender.toLowerCase()}, ${enhancedPhysicalDescription}`;
    const personalityText = personality.slice(0, 2).join(', ');
    const hobbiesText = hobbies.slice(0, 2).join(', ');
    
    const imagePrompt = `${basePrompt}Personality: ${personalityText}. Hobbies: ${hobbiesText}. Professional headshot, natural lighting, genuine smile, realistic human photography only.`;
    
    // Ensure prompt is under 1024 characters
    const finalPrompt = imagePrompt.length > 1000 ? imagePrompt.substring(0, 1000) : imagePrompt;

    console.log('[GENERATE-IMAGE] Generated prompt:', imagePrompt);

    // Generate image using Grok.ai (xAI) API
    console.log('[GENERATE-IMAGE] Calling Grok API...');
    const grokResponse = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        model: 'grok-2-image',
        n: 1,
        response_format: 'url',
      }),
    });

    console.log('[GENERATE-IMAGE] Grok API response status:', grokResponse.status);

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error('[GENERATE-IMAGE] Grok API error:', errorText);
      throw new Error(`Grok API error: ${grokResponse.status} - ${errorText}`);
    }

    const grokData = await grokResponse.json();
    console.log('[GENERATE-IMAGE] Grok API success response:', JSON.stringify(grokData, null, 2));

    // Extract image URL from Grok response
    const imageUrl = grokData.data?.[0]?.url;

    if (!imageUrl) {
      console.error('[GENERATE-IMAGE] No image URL in response:', grokData);
      throw new Error('No image URL returned from Grok API');
    }

    console.log('[GENERATE-IMAGE] Generated image URL:', imageUrl);

    return new Response(JSON.stringify({ 
      imageUrl,
      prompt: finalPrompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[GENERATE-IMAGE] Error generating companion image:', error);
    
    // Fallback to realistic human placeholder if Grok fails
    const genderParam = gender?.toLowerCase() === 'female' ? 'women' : 'men';
    const fallbackUrl = `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1494790108755-2616b612b786' : '1507003211169-0a1dd7228f2d'}?w=400&h=400&fit=crop&crop=face`;
    
    console.log('[GENERATE-IMAGE] Using fallback URL:', fallbackUrl);
    
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