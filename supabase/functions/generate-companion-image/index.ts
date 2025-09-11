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

    // Create a detailed, dynamic prompt for creative AI companion image
    let enhancedPhysicalDescription = '';
    if (physicalDescription && physicalDescription.trim()) {
      enhancedPhysicalDescription = `${physicalDescription}. `;
      console.log('[GENERATE-IMAGE] Physical description:', enhancedPhysicalDescription);
    }
    
    // Build rich, creative prompt with full personality and context
    const personalityText = personality.length > 0 ? personality.join(', ') : 'friendly, approachable';
    const hobbiesText = hobbies.length > 0 ? hobbies.join(', ') : 'reading, exploring';
    
    // Create dynamic scene descriptions based on personality and hobbies
    const sceneElements = [];
    if (hobbies.includes('reading') || hobbies.includes('books')) {
      sceneElements.push('cozy library setting with soft warm lighting');
    } else if (hobbies.includes('fitness') || hobbies.includes('sports')) {
      sceneElements.push('active lifestyle setting with natural outdoor lighting');
    } else if (hobbies.includes('art') || hobbies.includes('creative')) {
      sceneElements.push('artistic studio environment with creative lighting');
    } else if (hobbies.includes('travel') || hobbies.includes('adventure')) {
      sceneElements.push('wanderlust-inspired background with golden hour lighting');
    } else {
      sceneElements.push('beautifully composed environment with cinematic lighting');
    }
    
    // Personality-driven pose and expression
    const expressionStyle = personality.includes('confident') || personality.includes('outgoing') 
      ? 'confident pose with engaging eye contact and charismatic smile'
      : personality.includes('gentle') || personality.includes('kind')
      ? 'warm, genuine expression with soft smile and kind eyes'
      : personality.includes('mysterious') || personality.includes('introverted')
      ? 'thoughtful expression with subtle smile and intriguing gaze'
      : 'natural, authentic expression with genuine warmth';
    
    const basePrompt = `Portrait of a ${age}-year-old ${gender.toLowerCase()}, ${enhancedPhysicalDescription}`;
    
    const imagePrompt = `${basePrompt}Personality traits: ${personalityText}. Interests: ${hobbiesText}. ${expressionStyle}. ${sceneElements[0]}. High-quality portrait photography, detailed facial features, natural skin texture, dynamic composition, professional photography aesthetic, depth of field, vibrant but natural colors.`;
    
    // Use more of the available character limit (1024)
    const finalPrompt = imagePrompt.length > 1020 ? imagePrompt.substring(0, 1020) + '...' : imagePrompt;

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