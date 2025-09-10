import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, MapPin, Calendar, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { toast } from "sonner";

interface Companion {
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
}

interface CompanionBrowserProps {
  onBack: () => void;
  onSelectCompanion: (companion: Companion) => void;
}

export const CompanionBrowser = ({ onBack, onSelectCompanion }: CompanionBrowserProps) => {
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);
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

      if (error) {
        throw error;
      }

      const formattedCompanions: Companion[] = (data || []).map(companion => ({
        id: companion.id,
        name: companion.name,
        age: companion.age,
        gender: companion.gender,
        bio: companion.bio,
        hobbies: companion.hobbies || [],
        personality: companion.personality || [],
        likes: companion.likes || [],
        dislikes: companion.dislikes || [],
        image_url: companion.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`,
        location: companion.location || 'Virtual'
      }));

      setCompanions(formattedCompanions);
    } catch (error) {
      console.error('Error loading companions:', error);
      toast.error('Failed to load companions');
    } finally {
      setLoading(false);
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

      if (error) {
        throw error;
      }

      // Update local state
      setCompanions(prev => 
        prev.map(c => 
          c.id === companion.id 
            ? { ...c, image_url: newImageUrl }
            : c
        )
      );

      if (selectedCompanion?.id === companion.id) {
        setSelectedCompanion({ ...selectedCompanion, image_url: newImageUrl });
      }

    } catch (error) {
      console.error('Error generating new image:', error);
      toast.error('Failed to generate new image');
    }
  };

  const handleSelectCompanion = (companion: Companion) => {
    setSelectedCompanion(companion);
  };

  const handleConfirmSelection = () => {
    if (selectedCompanion) {
      onSelectCompanion(selectedCompanion);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading companions...</p>
        </div>
      </div>
    );
  }

  if (selectedCompanion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary py-8">
        {/* Header */}
        <header className="px-6 pb-8">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Heart className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">LoveCalls.ai</span>
            </div>
          </div>
        </header>

        {/* Detailed Companion View */}
        <div className="px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl">
              <CardContent className="p-0">
                <div className="md:flex">
                  {/* Image Section */}
                  <div className="md:w-1/2 relative">
                    <img 
                      src={selectedCompanion.image_url}
                      alt={selectedCompanion.name}
                      className="w-full h-96 md:h-full object-contain bg-muted/20 rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                    />
                    <Button
                      onClick={() => handleGenerateNewImage(selectedCompanion)}
                      disabled={imageGenerating}
                      className="absolute top-4 right-4 bg-primary/80 hover:bg-primary"
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {imageGenerating ? 'Generating...' : 'New AI Image'}
                    </Button>
                  </div>

                  {/* Details Section */}
                  <div className="md:w-1/2 p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h1 className="text-3xl font-bold">{selectedCompanion.name}</h1>
                        <div className="flex items-center text-muted-foreground mt-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{selectedCompanion.age} years old</span>
                          <span className="mx-2">•</span>
                          <span>{selectedCompanion.gender}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{selectedCompanion.location}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                      {selectedCompanion.bio}
                    </p>

                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Hobbies</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedCompanion.hobbies.map(hobby => (
                            <Badge key={hobby} variant="secondary">{hobby}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Personality</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedCompanion.personality.map(trait => (
                            <Badge key={trait} variant="outline">{trait}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Likes</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedCompanion.likes.map(like => (
                            <Badge key={like} className="bg-green-100 text-green-800 hover:bg-green-200">
                              {like}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Dislikes</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedCompanion.dislikes.map(dislike => (
                            <Badge key={dislike} className="bg-red-100 text-red-800 hover:bg-red-200">
                              {dislike}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setSelectedCompanion(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Browse
              </Button>
              
              <Button size="lg" onClick={handleConfirmSelection}>
                Choose {selectedCompanion.name}
                <Heart className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary py-8">
      {/* Header */}
      <header className="px-6 pb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Heart className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">LoveCalls.ai</span>
          </div>
        </div>
      </header>

      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Choose Your Companion</h1>
            <p className="text-xl text-muted-foreground">
              Browse our curated selection of AI companions, each with unique personalities and interests.
            </p>
          </div>

          {/* Companions Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {companions.map(companion => (
              <Card 
                key={companion.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                onClick={() => handleSelectCompanion(companion)}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <img 
                      src={companion.image_url}
                      alt={companion.name}
                      className="w-full h-64 object-contain bg-muted/20 rounded-t-lg"
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateNewImage(companion);
                      }}
                      disabled={imageGenerating}
                      className="absolute top-2 right-2 bg-primary/80 hover:bg-primary"
                      size="sm"
                    >
                      <Sparkles className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl">{companion.name}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {companion.age}
                      </div>
                    </div>
                    
                    <div className="flex items-center text-muted-foreground text-sm mb-3">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{companion.location}</span>
                    </div>

                    <CardDescription className="mb-4 line-clamp-3">
                      {companion.bio}
                    </CardDescription>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-1">Hobbies:</p>
                        <div className="flex flex-wrap gap-1">
                          {companion.hobbies.slice(0, 3).map(hobby => (
                            <Badge key={hobby} variant="secondary" className="text-xs">
                              {hobby}
                            </Badge>
                          ))}
                          {companion.hobbies.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{companion.hobbies.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Back Button */}
          <div className="text-center">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};