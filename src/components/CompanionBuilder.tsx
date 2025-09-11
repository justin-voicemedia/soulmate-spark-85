import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CompanionBuilderProps {
  onBack: () => void;
  onCompanionCreated: (companion: any) => void;
}

const sexOptions = ['Male', 'Female', 'Non-binary'];
const raceOptions = ['Asian', 'Black', 'Hispanic/Latino', 'White', 'Middle Eastern', 'Mixed', 'Other'];
const personalityTraits = [
  'Adventurous', 'Calm', 'Creative', 'Funny', 'Intelligent', 'Kind', 'Mysterious', 'Passionate', 'Romantic', 'Spontaneous'
];
const hobbyOptions = [
  'Reading', 'Cooking', 'Traveling', 'Gaming', 'Sports', 'Music', 'Art', 'Dancing', 'Hiking', 'Photography'
];

export const CompanionBuilder = ({ onBack, onCompanionCreated }: CompanionBuilderProps) => {
  const { user } = useAuth();
  const { generateCompanionImage, loading: imageLoading } = useImageGeneration();
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sex: '',
    race: '',
    age: 25,
    description: '',
    physicalDescription: '',
    personality: [] as string[],
    hobbies: [] as string[]
  });

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
      // Generate image
      const imageUrl = await generateCompanionImage({
        name: formData.name,
        age: formData.age,
        gender: formData.sex,
        bio: formData.description,
        physicalDescription: formData.physicalDescription,
        personality: formData.personality,
        hobbies: formData.hobbies
      });

      // Create companion in database
      const companionData = {
        name: formData.name,
        age: formData.age,
        gender: formData.sex.toLowerCase(),
        bio: formData.description || `Hi, I'm ${formData.name}! I'm a ${formData.age}-year-old ${formData.race} ${formData.sex.toLowerCase()} who loves ${formData.hobbies.slice(0, 2).join(' and ')}.`,
        hobbies: formData.hobbies,
        personality: formData.personality,
        likes: ['Meaningful conversations', 'Quality time'],
        dislikes: ['Negativity', 'Dishonesty'],
        image_url: imageUrl,
        location: 'Custom',
        is_prebuilt: false,
        user_id: user.id
      };

      const { data: companion, error } = await supabase
        .from('companions')
        .insert(companionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success(`${formData.name} has been created successfully!`);
      onCompanionCreated(companion);
      
    } catch (error) {
      console.error('Error creating companion:', error);
      toast.error('Failed to create companion. Please try again.');
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
            Build Your Perfect Companion
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Your Ideal Companion
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="physicalDescription">Physical Description (Optional)</Label>
                <Textarea
                  id="physicalDescription"
                  value={formData.physicalDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, physicalDescription: e.target.value }))}
                  placeholder="Describe your ideal companion's physical attributes and attire (height, build, hair, style, etc.)..."
                  rows={3}
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

              <Button 
                type="submit" 
                disabled={creating || imageLoading || !formData.name || !formData.sex || !formData.race}
                className="w-full"
              >
                {creating || imageLoading ? (
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