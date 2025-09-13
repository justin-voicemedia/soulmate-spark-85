import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Companion {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  personality: string[];
  hobbies: string[];
  image_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting companion image regeneration...');

    // Get all companions with broken image URLs (temporary imgen.x.ai URLs)
    const { data: companions, error: fetchError } = await supabaseClient
      .from('companions')
      .select('id, name, age, gender, bio, personality, hobbies, image_url')
      .eq('is_prebuilt', true)
      .like('image_url', '%imgen.x.ai%'); // Only get companions with broken URLs

    if (fetchError) {
      console.error('Error fetching companions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${companions?.length || 0} companions with broken images`);

    if (!companions || companions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No companions with broken images found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let successCount = 0;
    let failureCount = 0;

    // Process companions in batches to avoid overwhelming the API
    for (const companion of companions) {
      try {
        console.log(`Processing ${companion.name}...`);

        // Generate image prompt based on companion details
        const personalityStr = companion.personality?.join(', ') || 'friendly';
        const hobbiesStr = companion.hobbies?.slice(0, 3).join(', ') || 'various interests';
        
        const prompt = `Professional portrait photo of a ${companion.age}-year-old ${companion.gender.toLowerCase()} person named ${companion.name}. ${personalityStr} personality. Interested in ${hobbiesStr}. High quality, professional lighting, warm and approachable expression, modern casual attire, clean background. Ultra high resolution, photorealistic.`;

        console.log(`Generating image for ${companion.name} with prompt: ${prompt.substring(0, 100)}...`);

        // Generate image using OpenAI
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: prompt,
            size: '1024x1024',
            quality: 'high',
            n: 1
          }),
        });

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error(`OpenAI API error for ${companion.name}:`, errorText);
          failureCount++;
          continue;
        }

        const imageData = await imageResponse.json();
        const imageBase64 = imageData.data[0].b64_json;

        if (!imageBase64) {
          console.error(`No image data received for ${companion.name}`);
          failureCount++;
          continue;
        }

        // Convert base64 to blob
        const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        
        // Upload to Supabase storage
        const fileName = `companion-${companion.id}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('companion-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error(`Storage upload error for ${companion.name}:`, uploadError);
          failureCount++;
          continue;
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('companion-images')
          .getPublicUrl(fileName);

        const newImageUrl = urlData.publicUrl;

        // Update companion record with new image URL
        const { error: updateError } = await supabaseClient
          .from('companions')
          .update({ image_url: newImageUrl })
          .eq('id', companion.id);

        if (updateError) {
          console.error(`Database update error for ${companion.name}:`, updateError);
          failureCount++;
          continue;
        }

        console.log(`Successfully updated ${companion.name} with new image: ${newImageUrl}`);
        successCount++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${companion.name}:`, error);
        failureCount++;
      }
    }

    console.log(`Regeneration completed. Success: ${successCount}, Failures: ${failureCount}`);

    return new Response(
      JSON.stringify({ 
        message: `Image regeneration completed`, 
        updated: successCount,
        failed: failureCount,
        total: companions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-companion-images function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});