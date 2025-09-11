import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Palette, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AvatarCustomizerProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (avatarUrl: string) => void;
}

const avatarStyles = [
  'avataaars', 'big-ears', 'big-smile', 'croodles', 'fun-emoji', 
  'icons', 'initials', 'lorelei', 'micah', 'miniavs', 'open-peeps', 'personas'
];

const seedOptions = [
  'happy', 'smile', 'cool', 'sunshine', 'ocean', 'forest', 'mountain', 'star',
  'moon', 'fire', 'ice', 'rainbow', 'crystal', 'dream', 'magic', 'wonder'
];

export const AvatarCustomizer = ({ currentAvatarUrl, onAvatarUpdate }: AvatarCustomizerProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('avataaars');
  const [selectedSeed, setSelectedSeed] = useState(user?.email || 'default');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateAvatarUrl = (style: string, seed: string) => {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  };

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
  };

  const handleSeedSelect = (seed: string) => {
    setSelectedSeed(seed);
  };

  const handleGenerateRandom = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setSelectedSeed(randomSeed);
  };

  const handleSaveGenerated = async () => {
    const avatarUrl = generateAvatarUrl(selectedStyle, selectedSeed);
    await updateProfile(avatarUrl);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size should be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Create avatars bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const avatarsBucket = buckets?.find(bucket => bucket.name === 'avatars');
      
      if (!avatarsBucket) {
        await supabase.storage.createBucket('avatars', { public: true });
      }

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile(data.publicUrl);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (avatarUrl: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (error) throw error;

      onAvatarUpdate(avatarUrl);
      setIsOpen(false);
      toast.success("Avatar updated successfully!");

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update avatar");
    }
  };

  const previewUrl = generateAvatarUrl(selectedStyle, selectedSeed);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="absolute -bottom-2 -right-2 rounded-full p-2 h-8 w-8"
        >
          <Camera className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Your Avatar</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="w-24 h-24">
                <AvatarImage src={previewUrl} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="style">Avatar Style</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {avatarStyles.slice(0, 6).map(style => (
                    <Button
                      key={style}
                      variant={selectedStyle === style ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStyleSelect(style)}
                      className="p-1 h-auto"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={generateAvatarUrl(style, selectedSeed)} />
                      </Avatar>
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Personality</Label>
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {seedOptions.slice(0, 8).map(seed => (
                    <Button
                      key={seed}
                      variant={selectedSeed === seed ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSeedSelect(seed)}
                      className="text-xs px-2 py-1"
                    >
                      {seed}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateRandom}
                  className="flex-1"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Random
                </Button>
                <Button onClick={handleSaveGenerated} className="flex-1">
                  Save Avatar
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Click to upload your own image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 2MB
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-3"
                >
                  {uploading ? "Uploading..." : "Choose File"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};