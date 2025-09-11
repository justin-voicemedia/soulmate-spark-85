import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Image as ImageIcon, Sparkles, Upload, Settings } from 'lucide-react';
import { CompanionImageManager } from './CompanionImageManager';

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
  const [selectedCompanions, setSelectedCompanions] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const { generateCompanionImage } = useImageGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Check if companion has a placeholder image (Unsplash default)
  const hasPlaceholderImage = (companion: Companion) => {
    return companion.image_url.includes('unsplash.com') || 
           companion.image_url.includes('placeholder') ||
           !companion.image_url;
  };

  const generateNewImagesOnly = async () => {
    const companionsWithoutImages = companions.filter(hasPlaceholderImage);
    
    if (companionsWithoutImages.length === 0) {
      toast.info('All companions already have AI-generated images');
      return;
    }

    await generateImagesForCompanions(companionsWithoutImages);
  };

  const generateSelectedImages = async () => {
    if (selectedCompanions.length === 0) {
      toast.error('Please select companions to generate images for');
      return;
    }

    const companionsToGenerate = companions.filter(c => selectedCompanions.includes(c.id));
    await generateImagesForCompanions(companionsToGenerate);
  };

  const generateImagesForCompanions = async (companionsToGenerate: Companion[]) => {
    setGeneratingImages(true);
    let successCount = 0;
    
    for (const companion of companionsToGenerate) {
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
    setSelectedCompanions([]); // Clear selections after generation
    toast.success(`Generated ${successCount} out of ${companionsToGenerate.length} images`);
  };

  const toggleCompanionSelection = (companionId: string) => {
    setSelectedCompanions(prev => 
      prev.includes(companionId) 
        ? prev.filter(id => id !== companionId)
        : [...prev, companionId]
    );
  };

  const selectAllCompanions = () => {
    if (selectedCompanions.length === companions.length) {
      setSelectedCompanions([]);
    } else {
      setSelectedCompanions(companions.map(c => c.id));
    }
  };

  const handleImageUpload = async (companionId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingImages(prev => [...prev, companionId]);
    
    try {
      const companion = companions.find(c => c.id === companionId);
      if (!companion) {
        throw new Error('Companion not found');
      }

      // Create a unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${companionId}-${Date.now()}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('companion-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('companion-images')
        .getPublicUrl(fileName);

      // Update the companion with the new image URL
      const { error: updateError } = await supabase
        .from('companions')
        .update({ image_url: publicUrl })
        .eq('id', companionId);

      if (updateError) throw updateError;

      // Update local state
      setCompanions(prev => 
        prev.map(c => 
          c.id === companionId 
            ? { ...c, image_url: publicUrl }
            : c
        )
      );

      toast.success(`Image uploaded for ${companion.name}`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImages(prev => prev.filter(id => id !== companionId));
    }
  };

  const triggerFileUpload = (companionId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-companion-id', companionId);
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const companionId = event.target.getAttribute('data-companion-id');
    
    if (file && companionId) {
      handleImageUpload(companionId, file);
    }
    
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-muted-foreground">
          Manage companion images and generate AI images for the homepage
        </p>
      </div>

      <Tabs defaultValue="image-manager" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image-manager">Image Manager</TabsTrigger>
          <TabsTrigger value="bulk-operations">Bulk Operations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="image-manager" className="space-y-4">
          <CompanionImageManager />
        </TabsContent>
        
        <TabsContent value="bulk-operations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-6 h-6" />
                <div>
                  <CardTitle>Bulk Image Operations</CardTitle>
                  <CardDescription>
                    Generate AI images for multiple prebuilt companions at once
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={loadCompanions} 
                    disabled={companionsLoading}
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${companionsLoading ? 'animate-spin' : ''}`} />
                    Load Companions ({companions.length})
                  </Button>
                  
                  <Button 
                    onClick={generateNewImagesOnly}
                    disabled={generatingImages || companions.length === 0}
                    variant="secondary"
                  >
                    <Sparkles className={`w-4 h-4 mr-2 ${generatingImages ? 'animate-pulse' : ''}`} />
                    Generate New Images Only ({companions.filter(hasPlaceholderImage).length})
                  </Button>
                </div>

                {companions.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={selectAllCompanions}
                      variant="outline"
                      size="sm"
                    >
                      {selectedCompanions.length === companions.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    
                    <Button 
                      onClick={generateSelectedImages}
                      disabled={generatingImages || selectedCompanions.length === 0}
                      className="bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      <ImageIcon className={`w-4 h-4 mr-2 ${generatingImages ? 'animate-pulse' : ''}`} />
                      Generate Selected ({selectedCompanions.length})
                    </Button>
                  </div>
                )}
              </div>

              {companions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {companions.map((companion) => (
                    <Card key={companion.id} className={`border cursor-pointer transition-colors ${selectedCompanions.includes(companion.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                      <CardContent className="p-4">
                         <div className="flex items-center gap-2 mb-3">
                           <Checkbox
                             checked={selectedCompanions.includes(companion.id)}
                             onCheckedChange={() => toggleCompanionSelection(companion.id)}
                             onClick={(e) => e.stopPropagation()}
                           />
                           <div className="flex-1">
                             <h3 className="font-semibold">{companion.name}</h3>
                             <p className="text-sm text-muted-foreground">
                               {companion.age} • {companion.gender}
                             </p>
                           </div>
                           <div className="flex gap-1">
                             {hasPlaceholderImage(companion) && (
                               <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                                 Needs Image
                               </span>
                             )}
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 triggerFileUpload(companion.id);
                               }}
                               disabled={uploadingImages.includes(companion.id)}
                               className="h-6 px-2 text-xs"
                             >
                               {uploadingImages.includes(companion.id) ? (
                                 <RefreshCw className="w-3 h-3 animate-spin" />
                               ) : (
                                 <Upload className="w-3 h-3" />
                               )}
                             </Button>
                           </div>
                         </div>
                        <div 
                          className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden"
                          onClick={() => toggleCompanionSelection(companion.id)}
                        >
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
        </TabsContent>
      </Tabs>
      
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};