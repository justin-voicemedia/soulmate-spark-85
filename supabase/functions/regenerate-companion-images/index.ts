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

    const grokApiKey = Deno.env.get('GROK_API_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY'); // optional fallback
    if (!grokApiKey && !openAIApiKey) {
      throw new Error('No image generation API key configured (need GROK_API_KEY or OPENAI_API_KEY)');
    }

    // Helper utilities and retry logic
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    async function grokGenerate(prompt: string): Promise<{ url: string | null; status?: number; error?: string }> {
      if (!grokApiKey) return { url: null };
      const res = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${grokApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'grok-2-image', n: 1, response_format: 'url' }),
      });
      const status = res.status;
      if (!res.ok) {
        const text = await res.text();
        return { url: null, status, error: text };
      }
      const data = await res.json();
      const url = data.data?.[0]?.url ?? null;
      return { url, status };
    }

    async function openaiGenerate(prompt: string): Promise<{ b64: string | null; status?: number; error?: string }> {
      if (!openAIApiKey) return { b64: null };
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'high', n: 1 }),
      });
      const status = res.status;
      if (!res.ok) {
        const text = await res.text();
        return { b64: null, status, error: text };
      }
      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json ?? null;
      return { b64, status };
    }

    async function withRetry<T>(fn: () => Promise<T>, isRetryable: (r: any) => boolean, retries = 3, baseDelay = 1500): Promise<T> {
      let attempt = 0;
      let last: any;
      while (attempt <= retries) {
        last = await fn();
        if (!isRetryable(last)) return last;
        const jitter = Math.floor(Math.random() * 500);
        await sleep(baseDelay * Math.pow(2, attempt) + jitter);
        attempt++;
      }
      return last as T;
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{ id: string; name: string; reason: string }> = [];

    // Process companions sequentially to avoid overwhelming the API
    for (const companion of companions) {
      try {
        console.log(`Processing ${companion.name}...`);

        // Generate image prompt based on companion details
        const personalityStr = companion.personality?.join(', ') || 'friendly';
        const hobbiesStr = companion.hobbies?.slice(0, 3).join(', ') || 'various interests';
        
        const prompt = `Professional portrait photo of a ${companion.age}-year-old ${companion.gender.toLowerCase()} person named ${companion.name}. ${personalityStr} personality. Interested in ${hobbiesStr}. High quality, professional lighting, warm and approachable expression, modern casual attire, clean background. Ultra high resolution, photorealistic.`;

        // Build robust prompt with safe fallbacks
        const personalityStr = companion.personality?.join(', ') || 'friendly';
        const hobbiesStr = companion.hobbies?.slice(0, 3).join(', ') || 'various interests';
        const genderStr = companion.gender ? companion.gender.toLowerCase() : 'person';
        const ageStr = Number.isFinite(companion.age as number) ? `${companion.age}-year-old` : '';
        const prompt = `Professional portrait photo of a ${ageStr} ${genderStr} named ${companion.name}. ${personalityStr} personality. Interested in ${hobbiesStr}. High quality, professional lighting, warm and approachable expression, modern casual attire, clean background. Ultra high resolution, photorealistic.`.replace(/\s+/g, ' ').trim();

        console.log(`Generating image for ${companion.name} with prompt: ${prompt.substring(0, 100)}...`);

        // Try Grok with retries, then fallback to OpenAI if needed
        const grokResult = await withRetry(
          () => grokGenerate(prompt),
          (r) => !r || (!r.url) || (r.status === 429) || ((r.status ?? 0) >= 500),
          3,
          1500,
        );

        let finalBytes: Uint8Array | null = null;
        let contentType = 'image/png';

        if (grokResult && grokResult.url) {
          // Download with small retry
          const download = await withRetry(
            async () => {
              const res = await fetch(grokResult.url as string);
              return { ok: res.ok, status: res.status, res };
            },
            (r) => !r.ok || r.status === 429 || r.status >= 500,
            2,
            1500,
          );

          if (!download.ok) {
            const txt = await download.res.text();
            console.error(`Error downloading image for ${companion.name}:`, txt);
            failureCount++; failures.push({ id: companion.id, name: companion.name, reason: `download ${download.status}` });
            continue;
          }
          const arrayBuffer = await download.res.arrayBuffer();
          finalBytes = new Uint8Array(arrayBuffer);
          contentType = download.res.headers.get('content-type') ?? 'image/png';
        } else if (openAIApiKey) {
          const openaiResult = await withRetry(
            () => openaiGenerate(prompt),
            (r) => !r || (!r.b64) || (r.status === 429) || ((r.status ?? 0) >= 500),
            3,
            1500,
          );
          if (openaiResult && openaiResult.b64) {
            const binaryStr = atob(openaiResult.b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            finalBytes = bytes;
            contentType = 'image/png';
          } else {
            console.error(`Image generation failed for ${companion.name}`);
            failureCount++; failures.push({ id: companion.id, name: companion.name, reason: 'generation failed' });
            continue;
          }
        } else {
          console.error(`Image generation failed for ${companion.name}`);
          failureCount++; failures.push({ id: companion.id, name: companion.name, reason: 'generation failed' });
          continue;
        }

        const extension = contentType.includes('jpeg') ? 'jpg' : (contentType.includes('webp') ? 'webp' : 'png');
        const fileName = `companion-${companion.id}-${Date.now()}.${extension}`;
        const file = new File([finalBytes!], fileName, { type: contentType });

        const { error: uploadError } = await supabaseClient.storage
          .from('companion-images')
          .upload(fileName, file, {
            contentType,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Storage upload error for ${companion.name}:`, uploadError);
          failureCount++; failures.push({ id: companion.id, name: companion.name, reason: 'storage upload' });
          continue;
        }

        const { data: urlData } = supabaseClient.storage
          .from('companion-images')
          .getPublicUrl(fileName);

        const newImageUrl = urlData.publicUrl;

        const { error: updateError } = await supabaseClient
          .from('companions')
          .update({ image_url: newImageUrl })
          .eq('id', companion.id);

        if (updateError) {
          console.error(`Database update error for ${companion.name}:`, updateError);
          failureCount++; failures.push({ id: companion.id, name: companion.name, reason: 'db update' });
          continue;
        }

        console.log(`Successfully updated ${companion.name} with new image: ${newImageUrl}`);
        successCount++;

        // Jittered delay to avoid rate limits
        await sleep(1200 + Math.floor(Math.random() * 600));

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
        total: companions.length,
        failures
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-companion-images function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});