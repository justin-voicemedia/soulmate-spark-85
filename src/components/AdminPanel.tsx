import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Image as ImageIcon } from 'lucide-react';

interface Companion {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  hobbies: string[];
  personality: string[];
  image_url: string;
}

export const AdminPanel = () => {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [companionsLoading, setCompanionsLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const { generateCompanionImage } = useImageGeneration();

  const loadCompanions = async () => {
    setCompanionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('is_prebuilt', true);

      if (error) throw error;
      setCompanions(data || []);
    } catch (error) {
      console.error('Error loading companions:', error);
      toast.error('Failed to load companions');
    } finally {
      setCompanionsLoading(false);
    }
  };

  const generateAllImages = async () => {
    if (companions.length === 0) {
      toast.error('Please load companions first');
      return;
    }

    setGeneratingImages(true);
    let successCount = 0;
    
    for (const companion of companions) {
      try {
        toast.info(`Generating image for ${companion.name}...`);
        
        const imageUrl = await generateCompanionImage({
          name: companion.name,
          age: companion.age,
          gender: companion.gender,
          bio: companion.bio,
          personality: companion.personality,
          hobbies: companion.hobbies
        });

        // Update the companion with the new image URL
        const { error } = await supabase
          .from('companions')
          .update({ image_url: imageUrl })
          .eq('id', companion.id);

        if (error) throw error;

        // Update local state
        setCompanions(prev => 
          prev.map(c => 
            c.id === companion.id 
              ? { ...c, image_url: imageUrl }
              : c
          )
        );

        successCount++;
        toast.success(`Generated image for ${companion.name}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error generating image for ${companion.name}:`, error);
        toast.error(`Failed to generate image for ${companion.name}`);
      }
    }

    setGeneratingImages(false);
    toast.success(`Generated ${successCount} out of ${companions.length} images`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            <div>
              <CardTitle>Admin Panel - Companion Management</CardTitle>
              <CardDescription>
                Generate AI images for prebuilt companions using Grok.ai
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={loadCompanions} 
              disabled={companionsLoading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${companionsLoading ? 'animate-spin' : ''}`} />
              Load Companions ({companions.length})
            </Button>
            
            <Button 
              onClick={generateAllImages}
              disabled={generatingImages || companions.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <ImageIcon className={`w-4 h-4 mr-2 ${generatingImages ? 'animate-pulse' : ''}`} />
              Generate All Images
            </Button>
          </div>

          {companions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {companions.map((companion) => (
                <Card key={companion.id} className="border">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                      <img 
                        src={companion.image_url} 
                        alt={companion.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face`;
                        }}
                      />
                    </div>
                    <h3 className="font-semibold">{companion.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {companion.age} • {companion.gender}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {companion.bio}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {generatingImages && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Generating AI images... This may take a few minutes.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};