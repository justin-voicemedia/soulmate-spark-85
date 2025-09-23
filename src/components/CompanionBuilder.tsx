import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Sparkles, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { VoiceSelector } from '@/components/VoiceSelector';
import { RelationshipSelector } from '@/components/RelationshipSelector';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CompanionBuilderProps {
  onBack: () => void;
  onCompanionCreated: (companion: any) => void;
  editingCompanion?: {
    id: string;
    name: string;
    age: number;
    gender: string;
    bio: string;
    hobbies: string[];
    personality: string[];
    likes: string[];
    dislikes: string[];
    image_url: string;
    location: string;
  } | null;
}

const sexOptions = ['Male', 'Female', 'Non-binary'];
const raceOptions = ['Asian', 'Black', 'Hispanic/Latino', 'White', 'Middle Eastern', 'Mixed', 'Other'];
const personalityTraits = [
  'Adventurous', 'Calm', 'Creative', 'Funny', 'Intelligent', 'Kind', 'Mysterious', 'Passionate', 'Romantic', 'Spontaneous'
];
const hobbyOptions = [
  'Reading', 'Cooking', 'Traveling', 'Gaming', 'Sports', 'Music', 'Art', 'Dancing', 'Hiking', 'Photography'
];
const likeOptions = [
  'Meaningful conversations', 'Quality time', 'Adventure', 'Romance', 'Humor', 'Deep discussions', 'Spontaneous fun', 'Intellectual talks', 'Physical affection', 'Emotional support'
];
const dislikeOptions = [
  'Negativity', 'Dishonesty', 'Rudeness', 'Shallow conversations', 'Drama', 'Arrogance', 'Jealousy', 'Disrespect', 'Pessimism', 'Being ignored'
];

export const CompanionBuilder = ({ onBack, onCompanionCreated, editingCompanion }: CompanionBuilderProps) => {
  const { user } = useAuth();
  const { generateCompanionImage, loading: imageLoading } = useImageGeneration();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
  const [currentRelationshipType, setCurrentRelationshipType] = useState<string>('casual_friend');
  
  const [formData, setFormData] = useState({
    name: editingCompanion?.name || '',
    sex: editingCompanion?.gender ? editingCompanion.gender.charAt(0).toUpperCase() + editingCompanion.gender.slice(1) : '',
    race: '',
    age: editingCompanion?.age || 25,
    description: editingCompanion?.bio || '',
    physicalDescription: '',
    personality: editingCompanion?.personality || [] as string[],
    hobbies: editingCompanion?.hobbies || [] as string[],
    likes: editingCompanion?.likes || [] as string[],
    dislikes: editingCompanion?.dislikes || [] as string[]
  });

  // Set initial image and load companion's voice if editing
  useEffect(() => {
    if (editingCompanion?.image_url) {
      setGeneratedImageUrl(editingCompanion.image_url);
    }
    
    // Load companion settings if editing
    const loadCompanionSettings = async () => {
      if (!editingCompanion || !user) return;
      try {
        const { data, error } = await supabase
          .from('user_companions')
          .select('voice_id, relationship_type')
          .eq('user_id', user.id)
          .eq('companion_id', editingCompanion.id)
          .maybeSingle();
        if (!error && data) {
          if (data.voice_id) setSelectedVoice(data.voice_id);
          if (data.relationship_type) setCurrentRelationshipType(data.relationship_type);
        }
      } catch (error) {
        console.error('Error loading companion settings:', error);
      }
    };

    loadCompanionSettings();
  }, [editingCompanion, user]);

  const handlePersonalityChange = (trait: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      personality: checked 
        ? [...prev.personality, trait]
        : prev.personality.filter(t => t !== trait)
    }));
  };

  const handleHobbyChange = (hobby: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      hobbies: checked 
        ? [...prev.hobbies, hobby]
        : prev.hobbies.filter(h => h !== hobby)
    }));
  };

  const handleLikesChange = (like: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      likes: checked 
        ? [...prev.likes, like]
        : prev.likes.filter(l => l !== like)
    }));
  };

  const handleDislikesChange = (dislike: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      dislikes: checked 
        ? [...prev.dislikes, dislike]
        : prev.dislikes.filter(d => d !== dislike)
    }));
  };

  const handleGenerateImage = async () => {
    if (!formData.name || !formData.sex || !formData.race) {
      toast.error('Please fill in name, sex, and race before generating an image');
      return;
    }

    try {
      const imageUrl = await generateCompanionImage({
        name: formData.name,
        age: formData.age,
        gender: formData.sex,
        bio: formData.description,
        physicalDescription: formData.physicalDescription,
        personality: formData.personality,
        hobbies: formData.hobbies
      });
      
      setGeneratedImageUrl(imageUrl);
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Please try again.');
    }
  };

  const handleDeleteImage = () => {
    setGeneratedImageUrl(null);
    toast.success('Image deleted successfully');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to upload images');
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `companion-${user.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('companion-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('companion-images')
        .getPublicUrl(fileName);

      setGeneratedImageUrl(publicUrl);
      toast.success('Image uploaded successfully!');
      
      // Reset the file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a companion');
      return;
    }

    if (!formData.name || !formData.sex || !formData.race) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);

    try {
      let imageUrl = generatedImageUrl;
      
      // Generate image if not already generated and not editing
      if (!imageUrl && !editingCompanion) {
        imageUrl = await generateCompanionImage({
          name: formData.name,
          age: formData.age,
          gender: formData.sex,
          bio: formData.description,
          physicalDescription: formData.physicalDescription,
          personality: formData.personality,
          hobbies: formData.hobbies
        });
      }

      const companionData = {
        name: formData.name,
        age: formData.age,
        gender: formData.sex.toLowerCase(),
        bio: formData.description || `Hi, I'm ${formData.name}! I'm a ${formData.age}-year-old ${formData.sex.toLowerCase()} who loves ${formData.hobbies.slice(0, 2).join(' and ')}.`,
        hobbies: formData.hobbies,
        personality: formData.personality,
        likes: formData.likes.length > 0 ? formData.likes : ['Meaningful conversations', 'Quality time'],
        dislikes: formData.dislikes.length > 0 ? formData.dislikes : ['Negativity', 'Dishonesty'],
        image_url: imageUrl,
        location: editingCompanion?.location || 'Custom',
        is_prebuilt: false,
        user_id: user.id
      };

      let companion;
      if (editingCompanion) {
        // Update existing companion
        const { data, error } = await supabase
          .from('companions')
          .update(companionData)
          .eq('id', editingCompanion.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        companion = data;
        
        // Update voice selection for existing companion
        await supabase
          .from('user_companions')
          .upsert({
            user_id: user.id,
            companion_id: companion.id,
            voice_id: selectedVoice
          });
          
        toast.success(`${formData.name} has been updated successfully!`);
      } else {
        // Create new companion
        const { data, error } = await supabase
          .from('companions')
          .insert(companionData)
          .select()
          .single();

        if (error) throw error;
        companion = data;
        
        // Set voice selection for new companion
        await supabase
          .from('user_companions')
          .upsert({
            user_id: user.id,
            companion_id: companion.id,
            voice_id: selectedVoice
          });
          
        toast.success(`${formData.name} has been created successfully!`);
      }

      onCompanionCreated(companion);
      
    } catch (error) {
      console.error('Error saving companion:', error);
      toast.error(`Failed to ${editingCompanion ? 'update' : 'create'} companion. Please try again.`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {editingCompanion ? `Edit ${editingCompanion.name}` : 'Build Your Perfect Companion'}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {editingCompanion ? `Edit ${editingCompanion.name}` : 'Create Your Ideal Companion'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingCompanion && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Edit Companion Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="relationship" className="w-full">
                    <TabsList className="w-full flex">
                      <TabsTrigger value="relationship" className="flex-1">Relationship</TabsTrigger>
                    </TabsList>
                    <TabsContent value="relationship" className="mt-4">
                      <RelationshipSelector
                        companionId={editingCompanion.id}
                        companionName={editingCompanion.name}
                        currentRelationshipType={currentRelationshipType}
                        onRelationshipChange={(t) => setCurrentRelationshipType(t)}
                        showTitle={false}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter a name"
                    required
                  />
                </div>
                
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    min="18"
                    max="65"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Sex *</Label>
                  <Select value={formData.sex} onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      {sexOptions.map(sex => (
                        <SelectItem key={sex} value={sex}>{sex}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Race/Ethnicity *</Label>
                  <Select value={formData.race} onValueChange={(value) => setFormData(prev => ({ ...prev, race: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select race/ethnicity" />
                    </SelectTrigger>
                    <SelectContent>
                      {raceOptions.map(race => (
                        <SelectItem key={race} value={race}>{race}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Physical Description */}
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="physicalDescription">Physical Description (Optional)</Label>
                  <span className={`text-sm ${
                    formData.physicalDescription.length > 1000 ? 'text-destructive' : 
                    formData.physicalDescription.length > 900 ? 'text-yellow-500' : 
                    'text-muted-foreground'
                  }`}>
                    {formData.physicalDescription.length}/1020
                  </span>
                </div>
                <Textarea
                  id="physicalDescription"
                  value={formData.physicalDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, physicalDescription: e.target.value }))}
                  placeholder="Describe your ideal companion's physical attributes and attire (height, build, hair, style, etc.)..."
                  rows={3}
                  maxLength={1020}
                />
              </div>

              {/* Personality Description */}
              <div>
                <Label htmlFor="description">Personality Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your ideal companion's personality and what makes them special..."
                  rows={3}
                />
              </div>

              {/* Personality Traits */}
              <div>
                <Label>Personality Traits</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                  {personalityTraits.map(trait => (
                    <div key={trait} className="flex items-center space-x-2">
                      <Checkbox
                        id={`personality-${trait}`}
                        checked={formData.personality.includes(trait)}
                        onCheckedChange={(checked) => handlePersonalityChange(trait, checked as boolean)}
                      />
                      <Label htmlFor={`personality-${trait}`} className="text-sm">{trait}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hobbies */}
              <div>
                <Label>Hobbies & Interests</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                  {hobbyOptions.map(hobby => (
                    <div key={hobby} className="flex items-center space-x-2">
                      <Checkbox
                        id={`hobby-${hobby}`}
                        checked={formData.hobbies.includes(hobby)}
                        onCheckedChange={(checked) => handleHobbyChange(hobby, checked as boolean)}
                      />
                      <Label htmlFor={`hobby-${hobby}`} className="text-sm">{hobby}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Likes */}
              <div>
                <Label>What They Like</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                  {likeOptions.map(like => (
                    <div key={like} className="flex items-center space-x-2">
                      <Checkbox
                        id={`like-${like}`}
                        checked={formData.likes.includes(like)}
                        onCheckedChange={(checked) => handleLikesChange(like, checked as boolean)}
                      />
                      <Label htmlFor={`like-${like}`} className="text-sm">{like}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dislikes */}
              <div>
                <Label>What They Dislike</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                  {dislikeOptions.map(dislike => (
                    <div key={dislike} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dislike-${dislike}`}
                        checked={formData.dislikes.includes(dislike)}
                        onCheckedChange={(checked) => handleDislikesChange(dislike, checked as boolean)}
                      />
                      <Label htmlFor={`dislike-${dislike}`} className="text-sm">{dislike}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Selection */}
              <div>
                <Label>Voice</Label>
                <VoiceSelector
                  value={selectedVoice}
                  onValueChange={setSelectedVoice}
                  disabled={creating || uploading}
                  companionName={formData.name || "your companion"}
                />
              </div>

              {/* Image Generation Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Companion Image</Label>
                  {!editingCompanion && !generatedImageUrl && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateImage}
                        disabled={imageLoading || uploading || !formData.name || !formData.sex || !formData.race}
                      >
                        {imageLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Generate AI Image
                          </>
                        )}
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={imageLoading || uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          id="image-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={imageLoading || uploading}
                          asChild
                        >
                          <label htmlFor="image-upload" className="cursor-pointer">
                            {uploading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Photo
                              </>
                            )}
                          </label>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {editingCompanion && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      Image editing is not available when editing existing companions. The current image will be preserved.
                    </p>
                  </div>
                )}

                {generatedImageUrl && (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img 
                        src={generatedImageUrl} 
                        alt={`Generated image of ${formData.name}`}
                        className="w-48 h-48 object-cover rounded-lg border shadow-sm"
                      />
                    </div>
                    {!editingCompanion && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateImage}
                          disabled={imageLoading || uploading}
                        >
                          {imageLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Generate New AI Image
                            </>
                          )}
                        </Button>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={imageLoading || uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="replace-image-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={imageLoading || uploading}
                            asChild
                          >
                            <label htmlFor="replace-image-upload" className="cursor-pointer">
                              {uploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload New Photo
                                </>
                              )}
                            </label>
                          </Button>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Image
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Companion Image?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this image? This action cannot be undone and you'll need to generate a new image.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteImage} className="bg-destructive hover:bg-destructive/90">
                                Delete Image
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={creating || imageLoading || uploading || !formData.name || !formData.sex || !formData.race}
                className="w-full"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Your Companion...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Companion
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};