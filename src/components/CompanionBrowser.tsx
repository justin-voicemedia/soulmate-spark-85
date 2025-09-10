import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, MapPin, Calendar } from "lucide-react";
import { useState } from "react";

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
  image: string;
  location: string;
}

interface CompanionBrowserProps {
  onBack: () => void;
  onSelectCompanion: (companion: Companion) => void;
}

const prebuiltCompanions: Companion[] = [
  {
    id: "1",
    name: "Emma",
    age: 28,
    gender: "Female",
    bio: "Hi, I'm Emma! I'm passionate about art, literature, and deep conversations. I love exploring new ideas and helping others discover their creative side.",
    hobbies: ["Painting", "Reading", "Yoga", "Cooking"],
    personality: ["Creative", "Thoughtful", "Caring", "Intelligent"],
    likes: ["Poetry", "Museums", "Coffee shops", "Nature walks"],
    dislikes: ["Loud crowds", "Negativity", "Rush"],
    image: "https://images.unsplash.com/photo-1494790108755-2616c14952f4?w=400&h=400&fit=crop&crop=face",
    location: "San Francisco, CA"
  },
  {
    id: "2",
    name: "Alex",
    age: 32,
    gender: "Male",
    bio: "Adventure seeker and tech enthusiast. I'm Alex, and I believe life is about experiencing new things and pushing boundaries. Let's explore together!",
    hobbies: ["Hiking", "Photography", "Gaming", "Travel"],
    personality: ["Adventurous", "Confident", "Funny", "Energetic"],
    likes: ["Mountain climbing", "New technologies", "Good coffee", "Road trips"],
    dislikes: ["Boring routines", "Closed minds", "Pessimism"],
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    location: "Denver, CO"
  },
  {
    id: "3",
    name: "Sophie",
    age: 26,
    gender: "Female",
    bio: "Wellness coach and mindfulness advocate. I'm Sophie, here to help you find balance and inner peace through our conversations.",
    hobbies: ["Meditation", "Yoga", "Reading", "Dancing"],
    personality: ["Calm", "Caring", "Gentle", "Thoughtful"],
    likes: ["Sunrise meditation", "Herbal tea", "Self-improvement", "Nature"],
    dislikes: ["Stress", "Negativity", "Chaos"],
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    location: "Portland, OR"
  },
  {
    id: "4",
    name: "Marcus",
    age: 35,
    gender: "Male",
    bio: "Intellectual with a passion for philosophy and deep discussions. I'm Marcus, and I enjoy exploring life's big questions and meaningful connections.",
    hobbies: ["Reading", "Chess", "Writing", "Classical music"],
    personality: ["Intelligent", "Thoughtful", "Loyal", "Gentle"],
    likes: ["Philosophy books", "Quiet evenings", "Deep conversations", "Museums"],
    dislikes: ["Small talk", "Dishonesty", "Superficiality"],
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    location: "Boston, MA"
  },
  {
    id: "5",
    name: "Zoe",
    age: 24,
    gender: "Female",
    bio: "Creative soul with a love for music and spontaneous adventures. I'm Zoe, and I believe every day should have a little magic in it!",
    hobbies: ["Music", "Art", "Dancing", "Travel"],
    personality: ["Creative", "Spontaneous", "Energetic", "Funny"],
    likes: ["Live concerts", "Street art", "Vintage shops", "Late night conversations"],
    dislikes: ["Rigid schedules", "Judgmental people", "Boredom"],
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
    location: "Austin, TX"
  },
  {
    id: "6",
    name: "David",
    age: 29,
    gender: "Male",
    bio: "Fitness enthusiast and motivational spirit. I'm David, here to inspire and support you in achieving your goals, whatever they may be.",
    hobbies: ["Fitness", "Cooking", "Sports", "Hiking"],
    personality: ["Energetic", "Confident", "Caring", "Loyal"],
    likes: ["Morning workouts", "Healthy cooking", "Team sports", "Personal growth"],
    dislikes: ["Excuses", "Unhealthy habits", "Negativity"],
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    location: "Miami, FL"
  }
];

export const CompanionBrowser = ({ onBack, onSelectCompanion }: CompanionBrowserProps) => {
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);

  const handleSelectCompanion = (companion: Companion) => {
    setSelectedCompanion(companion);
  };

  const handleConfirmSelection = () => {
    if (selectedCompanion) {
      onSelectCompanion(selectedCompanion);
    }
  };

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
                  <div className="md:w-1/2">
                    <img 
                      src={selectedCompanion.image}
                      alt={selectedCompanion.name}
                      className="w-full h-96 md:h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                    />
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
            {prebuiltCompanions.map(companion => (
              <Card 
                key={companion.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                onClick={() => handleSelectCompanion(companion)}
              >
                <CardContent className="p-0">
                  <img 
                    src={companion.image}
                    alt={companion.name}
                    className="w-full h-64 object-cover rounded-t-lg"
                  />
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