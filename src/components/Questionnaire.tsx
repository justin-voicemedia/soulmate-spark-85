import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import { useState } from "react";

interface QuestionnaireData {
  companionType: string;
  gender: string;
  ageRange: string;
  hobbies: string[];
  personality: string[];
  relationshipGoals: string;
  name: string;
}

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

interface QuestionnaireProps {
  onBack: () => void;
  onComplete: (data: QuestionnaireData, companionId?: string) => void;
  selectedCompanion?: Companion | null;
}

export const Questionnaire = ({ onBack, onComplete, selectedCompanion }: QuestionnaireProps) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuestionnaireData>({
    companionType: "",
    gender: "",
    ageRange: "",
    hobbies: [],
    personality: [],
    relationshipGoals: "",
    name: "",
  });

  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(data, selectedCompanion?.id);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const updateData = (key: keyof QuestionnaireData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'hobbies' | 'personality', item: string) => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(item) 
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item]
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        if (selectedCompanion) {
          return (
            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader>
                <div className="text-center space-y-4">
                  <div className="mx-auto w-24 h-24 rounded-full overflow-hidden">
                    <img 
                      src={selectedCompanion.image_url} 
                      alt={selectedCompanion.name}
                      className="w-full h-full object-contain bg-muted"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedCompanion.name}`;
                      }}
                    />
                  </div>
                  <CardTitle className="text-2xl">How would you like to connect with {selectedCompanion.name}?</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup value={data.companionType} onValueChange={(value) => updateData('companionType', value)}>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="casual" id="casual" />
                      <Label htmlFor="casual" className="cursor-pointer flex-1">
                        <div>
                          <h3 className="font-semibold">Casual Friend</h3>
                          <p className="text-muted-foreground">Light conversations, fun chats, share daily moments with {selectedCompanion.name}</p>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="romantic" id="romantic" />
                      <Label htmlFor="romantic" className="cursor-pointer flex-1">
                        <div>
                          <h3 className="font-semibold">Romantic Partner</h3>
                          <p className="text-muted-foreground">Build a deep emotional connection and romantic bond with {selectedCompanion.name}</p>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="spiritual" id="spiritual" />
                      <Label htmlFor="spiritual" className="cursor-pointer flex-1">
                        <div>
                          <h3 className="font-semibold">Spiritual Guide</h3>
                          <p className="text-muted-foreground">Explore mindfulness and spiritual growth together with {selectedCompanion.name}</p>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="intimate" id="intimate" />
                      <Label htmlFor="intimate" className="cursor-pointer flex-1">
                        <div>
                          <h3 className="font-semibold">Intimate Companion</h3>
                          <p className="text-muted-foreground">Share intimate moments and adult conversations with {selectedCompanion.name} (18+)</p>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">What type of companion are you looking for?</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={data.companionType} onValueChange={(value) => updateData('companionType', value)}>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="casual" id="casual" />
                    <Label htmlFor="casual" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Casual Friend</h3>
                        <p className="text-muted-foreground">Light conversations, fun chats, everyday companionship</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="romantic" id="romantic" />
                    <Label htmlFor="romantic" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Romantic Partner</h3>
                        <p className="text-muted-foreground">Deep emotional connection, romantic conversations</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="spiritual" id="spiritual" />
                    <Label htmlFor="spiritual" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Spiritual Guide</h3>
                        <p className="text-muted-foreground">Mindfulness, meditation, spiritual growth discussions</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="intimate" id="intimate" />
                    <Label htmlFor="intimate" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Intimate Companion</h3>
                        <p className="text-muted-foreground">Adult conversations, intimate connection (18+)</p>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Preferred Gender & Age Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">Gender Preference</Label>
                <RadioGroup value={data.gender} onValueChange={(value) => updateData('gender', value)}>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="cursor-pointer">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="cursor-pointer">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="nonbinary" id="nonbinary" />
                      <Label htmlFor="nonbinary" className="cursor-pointer">Non-binary</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Age Range</Label>
                <RadioGroup value={data.ageRange} onValueChange={(value) => updateData('ageRange', value)}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="18-25" id="age1" />
                      <Label htmlFor="age1" className="cursor-pointer">18-25</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="26-35" id="age2" />
                      <Label htmlFor="age2" className="cursor-pointer">26-35</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="36-45" id="age3" />
                      <Label htmlFor="age3" className="cursor-pointer">36-45</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="46+" id="age4" />
                      <Label htmlFor="age4" className="cursor-pointer">46+</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        const hobbiesList = [
          "Reading", "Cooking", "Travel", "Music", "Art", "Sports", "Gaming", 
          "Yoga", "Photography", "Dancing", "Movies", "Hiking"
        ];
        
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Interests & Hobbies</CardTitle>
              <p className="text-center text-muted-foreground">Select all that apply</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {hobbiesList.map(hobby => (
                  <div key={hobby} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                    <Checkbox
                      id={hobby}
                      checked={data.hobbies.includes(hobby)}
                      onCheckedChange={() => toggleArrayItem('hobbies', hobby)}
                    />
                    <Label htmlFor={hobby} className="cursor-pointer">{hobby}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        const personalityTraits = [
          "Funny", "Intelligent", "Caring", "Adventurous", "Calm", "Energetic",
          "Creative", "Loyal", "Spontaneous", "Thoughtful", "Confident", "Gentle"
        ];
        
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Personality Traits</CardTitle>
              <p className="text-center text-muted-foreground">What qualities do you value?</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {personalityTraits.map(trait => (
                  <div key={trait} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-secondary cursor-pointer">
                    <Checkbox
                      id={trait}
                      checked={data.personality.includes(trait)}
                      onCheckedChange={() => toggleArrayItem('personality', trait)}
                    />
                    <Label htmlFor={trait} className="cursor-pointer">{trait}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">What are you hoping to find?</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={data.relationshipGoals} onValueChange={(value) => updateData('relationshipGoals', value)}>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="friendship" id="friendship" />
                    <Label htmlFor="friendship" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Friendship</h3>
                        <p className="text-muted-foreground">Someone to talk to and share experiences with</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="romantic" id="romantic-goal" />
                    <Label htmlFor="romantic-goal" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Romance</h3>
                        <p className="text-muted-foreground">Deep emotional connection and romantic relationship</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="support" id="support" />
                    <Label htmlFor="support" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Emotional Support</h3>
                        <p className="text-muted-foreground">Someone who listens and provides comfort</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-secondary cursor-pointer">
                    <RadioGroupItem value="exploration" id="exploration" />
                    <Label htmlFor="exploration" className="cursor-pointer flex-1">
                      <div>
                        <h3 className="font-semibold">Exploration</h3>
                        <p className="text-muted-foreground">Curious to explore AI companionship</p>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Finally, what should we call you?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-base font-semibold">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your preferred name"
                    value={data.name}
                    onChange={(e) => updateData('name', e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const canContinue = () => {
    switch (step) {
      case 1: return data.companionType !== "";
      case 2: return data.gender !== "" && data.ageRange !== "";
      case 3: return data.hobbies.length > 0;
      case 4: return data.personality.length > 0;
      case 5: return data.relationshipGoals !== "";
      case 6: return data.name.trim() !== "";
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary py-8">
      {/* Header */}
      <header className="px-6 pb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onBack}
          >
            <Heart className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">LoveCalls.ai</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="px-6">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="px-6 mt-8">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handlePrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? (selectedCompanion ? "Back to Browse" : "Back to Home") : "Previous"}
          </Button>
          
          <Button onClick={handleNext} disabled={!canContinue()}>
            {step === totalSteps ? "Complete" : "Next"}
            {step !== totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};