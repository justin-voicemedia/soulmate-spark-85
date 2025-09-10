import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanionImageRequest {
  name: string;
  age: number;
  gender: string;
  bio: string;
  personality: string[];
  hobbies: string[];
}

interface GeneratedImageResponse {
  imageUrl: string;
  prompt?: string;
  error?: string;
  fallback?: boolean;
}

export const useImageGeneration = () => {
  const [loading, setLoading] = useState(false);

  const generateCompanionImage = async (companionData: CompanionImageRequest): Promise<string> => {
    setLoading(true);
    
    try {
      console.log('Generating image for companion:', companionData.name);
      
      const { data, error } = await supabase.functions.invoke('generate-companion-image', {
        body: companionData
      });

      if (error) {
        console.error('Error invoking generate-companion-image:', error);
        throw new Error(error.message);
      }

      const response: GeneratedImageResponse = data;
      
      if (response.fallback) {
        toast.warning('Using fallback image - Grok.ai API may not be configured properly');
        console.warn('Fallback image used:', response.error);
      } else {
        toast.success('AI image generated successfully!');
      }

      console.log('Generated image URL:', response.imageUrl);
      return response.imageUrl;
      
    } catch (error) {
      console.error('Failed to generate companion image:', error);
      toast.error('Failed to generate AI image');
      
      // Return a realistic human fallback URL instead of cartoon
      const genderSeed = companionData.gender.toLowerCase() === 'female' ? 'women' : 'men';  
      return `https://images.unsplash.com/photo-${companionData.gender === 'female' ? '1494790108755-2616b612b786' : '1507003211169-0a1dd7228f2d'}?w=400&h=400&fit=crop&crop=face`;
    } finally {
      setLoading(false);
    }
  };

  const generateCustomCompanionImage = async (
    name: string,
    customPrompt: string
  ): Promise<string> => {
    setLoading(true);
    
    try {
      // For custom prompts, we can use a simplified version
      const companionData: CompanionImageRequest = {
        name,
        age: 25,
        gender: 'person',
        bio: customPrompt,
        personality: [],
        hobbies: []
      };

      return await generateCompanionImage(companionData);
      
    } catch (error) {
      console.error('Failed to generate custom image:', error);
      return `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face`;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateCompanionImage,
    generateCustomCompanionImage,
    loading
  };
};