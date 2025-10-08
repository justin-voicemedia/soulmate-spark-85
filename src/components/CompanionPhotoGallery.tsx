import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Sparkles, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CompanionPhotoGalleryProps {
  companion: {
    id: string;
    name: string;
    age: number;
    gender: string;
    bio: string;
    personality: string[];
    hobbies: string[];
    race?: string;
    image_url: string;
  };
  onPhotoUpdate: (newImageUrl: string) => void;
}

export const CompanionPhotoGallery = ({ companion, onPhotoUpdate }: CompanionPhotoGalleryProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("realistic portrait");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const photoStyles = [
    { value: "realistic portrait", label: "Realistic Portrait" },
    { value: "professional headshot", label: "Professional Headshot" },
    { value: "casual photo", label: "Casual Photo" },
    { value: "artistic portrait", label: "Artistic Portrait" },
    { value: "outdoor scene", label: "Outdoor Scene" },
  ];

  const handleGeneratePhoto = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-companion-photo', {
        body: {
          companionData: {
            name: companion.name,
            age: companion.age,
            gender: companion.gender,
            bio: companion.bio,
            personality: companion.personality,
            hobbies: companion.hobbies,
            race: companion.race
          },
          style: selectedStyle
        }
      });

      if (error) throw error;

      if (data?.success && data?.imageData) {
        setGeneratedImage(data.imageData);
        toast.success("Photo generated successfully!");
      } else {
        throw new Error("No image data received");
      }
    } catch (error: any) {
      console.error('Error generating photo:', error);
      if (error.message?.includes('Rate limit')) {
        toast.error("Rate limit exceeded. Please try again in a moment.");
      } else if (error.message?.includes('Payment')) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error("Failed to generate photo. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseGeneratedPhoto = async () => {
    if (!generatedImage) return;

    try {
      // Convert base64 to blob
      const base64Data = generatedImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Upload to storage
      const fileName = `${companion.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('companion-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('companion-images')
        .getPublicUrl(fileName);

      // Update companion image_url
      const { error: updateError } = await supabase
        .from('companions')
        .update({ image_url: publicUrl })
        .eq('id', companion.id);

      if (updateError) throw updateError;

      onPhotoUpdate(publicUrl);
      setGeneratedImage(null);
      toast.success("Photo updated successfully!");
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error("Failed to save photo");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${companion.id}-${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('companion-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('companion-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('companions')
        .update({ image_url: publicUrl })
        .eq('id', companion.id);

      if (updateError) throw updateError;

      onPhotoUpdate(publicUrl);
      toast.success("Photo uploaded successfully!");
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <div className="space-y-2">
            <Label>Photo Style</Label>
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {photoStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGeneratePhoto}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Photo
              </>
            )}
          </Button>

          {generatedImage && (
            <div className="space-y-3 mt-4">
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUseGeneratedPhoto} className="flex-1">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Use This Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setGeneratedImage(null)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Choose Photo</Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Max file size: 5MB. Supported formats: JPG, PNG, WEBP
            </p>
          </div>

          <Button
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={isUploading}
            className="w-full"
            variant="outline"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Current Photo Preview */}
      <div className="mt-6">
        <Label className="mb-2 block">Current Photo</Label>
        <div className="relative rounded-lg overflow-hidden border border-border aspect-square max-w-xs">
          <img
            src={companion.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`}
            alt={companion.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`;
            }}
          />
        </div>
      </div>
    </Card>
  );
};
