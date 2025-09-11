import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, RefreshCw, Sparkles, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useImageGeneration } from '@/hooks/useImageGeneration';

interface Companion {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  hobbies: string[];
  personality: string[];
  image_url: string;
  location: string;
  is_prebuilt: boolean;
}

export const CompanionImageManager = () => {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const { generateCompanionImage, loading: imageGenerating } = useImageGeneration();

  useEffect(() => {
    loadCompanions();
  }, []);

  const loadCompanions = async () => {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('is_prebuilt', true)
        .order('created_at');

      if (error) throw error;

      const formattedCompanions: Companion[] = (data || []).map(companion => ({
        id: companion.id,
        name: companion.name,
        age: companion.age,
        gender: companion.gender,
        bio: companion.bio,
        hobbies: companion.hobbies || [],
        personality: companion.personality || [],
        image_url: companion.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`,
        location: companion.location || 'Virtual',
        is_prebuilt: companion.is_prebuilt
      }));

      setCompanions(formattedCompanions);
    } catch (error) {
      console.error('Error loading companions:', error);
      toast.error('Failed to load companions');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (companionId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploading(companionId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `companion-${companionId}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('companion-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('companion-images')
        .getPublicUrl(fileName);

      // Update companion image URL in database
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

      toast.success('Image uploaded successfully!');
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleGenerateNewImage = async (companion: Companion) => {
    try {
      toast.info('Generating new AI image...');
      
      const newImageUrl = await generateCompanionImage({
        name: companion.name,
        age: companion.age,
        gender: companion.gender,
        bio: companion.bio,
        personality: companion.personality,
        hobbies: companion.hobbies
      });

      // Update the companion's image in the database
      const { error } = await supabase
        .from('companions')
        .update({ image_url: newImageUrl })
        .eq('id', companion.id);

      if (error) throw error;

      // Update local state
      setCompanions(prev => 
        prev.map(c => 
          c.id === companion.id 
            ? { ...c, image_url: newImageUrl }
            : c
        )
      );

      toast.success('New image generated successfully!');

    } catch (error) {
      console.error('Error generating new image:', error);
      toast.error('Failed to generate new image');
    }
  };

  const handleDeleteImage = async (companionId: string) => {
    try {
      // Reset to default avatar
      const companion = companions.find(c => c.id === companionId);
      if (!companion) return;

      const defaultImageUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`;
      
      const { error } = await supabase
        .from('companions')
        .update({ image_url: defaultImageUrl })
        .eq('id', companionId);

      if (error) throw error;

      // Update local state
      setCompanions(prev => 
        prev.map(c => 
          c.id === companionId 
            ? { ...c, image_url: defaultImageUrl }
            : c
        )
      );

      toast.success('Image reset to default');
      
    } catch (error) {
      console.error('Error resetting image:', error);
      toast.error('Failed to reset image');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Companion Image Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading companions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Companion Image Manager
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload custom images or generate AI images for your companions
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companions.map(companion => (
            <Card key={companion.id} className="overflow-hidden">
              <div className="relative">
                <img 
                  src={companion.image_url}
                  alt={companion.name}
                  className="w-full h-48 object-cover"
                />
                <Badge 
                  className="absolute top-2 left-2 bg-background/80 text-foreground" 
                  variant="secondary"
                >
                  {companion.gender}
                </Badge>
              </div>
              
              <CardContent className="p-4">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{companion.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {companion.age} years old • {companion.location}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {companion.bio}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Upload Image */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(companion.id, file);
                        e.target.value = '';
                      }}
                      disabled={uploading === companion.id || imageGenerating}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id={`upload-${companion.id}`}
                    />
                    <Button
                      variant="outline"
                      disabled={uploading === companion.id || imageGenerating}
                      asChild
                      className="w-full"
                    >
                      <label htmlFor={`upload-${companion.id}`} className="cursor-pointer">
                        {uploading === companion.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload New Image
                          </>
                        )}
                      </label>
                    </Button>
                  </div>

                  {/* Generate AI Image */}
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateNewImage(companion)}
                    disabled={imageGenerating || uploading === companion.id}
                    className="w-full"
                  >
                    {imageGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Image
                      </>
                    )}
                  </Button>

                  {/* Reset to Default */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive"
                        disabled={uploading === companion.id || imageGenerating}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Default
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Image</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset {companion.name}'s image to the default avatar. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteImage(companion.id)}>
                          Reset Image
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No prebuilt companions found.</p>
            <p className="text-sm text-muted-foreground">
              Create some prebuilt companions first to manage their images.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};