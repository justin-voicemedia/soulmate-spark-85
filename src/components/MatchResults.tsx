import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Star, ArrowLeft } from 'lucide-react';

interface CompanionMatch {
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
  compatibilityScore: number;
  matchReasons: string[];
}

interface QuestionnaireData {
  companionType: string;
  gender: string;
  ageRange: string;
  hobbies: string[];
  personality: string[];
  relationshipGoals: string;
  name: string;
}

interface MatchResultsProps {
  matches: CompanionMatch[];
  userData: QuestionnaireData;
  onSelectCompanion: (companion: CompanionMatch) => void;
  onBack: () => void;
  recommendationSummary: string;
}

export const MatchResults = ({ 
  matches, 
  userData, 
  onSelectCompanion, 
  onBack, 
  recommendationSummary 
}: MatchResultsProps) => {
  
  const getCompatibilityColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 0.6) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 0.4) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 0.8) return "Excellent Match";
    if (score >= 0.6) return "Great Match";
    if (score >= 0.4) return "Good Match";
    return "Potential Match";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary py-8">
      {/* Header */}
      <header className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={onBack}
            >
              <Heart className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">LoveCalls.ai</span>
            </div>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Questionnaire
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Your Perfect Matches, {userData.name}!</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {recommendationSummary}
            </p>
          </div>
        </div>
      </header>

      {/* Matches Grid */}
      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          {matches.length === 0 ? (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="text-center py-12">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No perfect matches yet</h3>
                <p className="text-muted-foreground mb-4">
                  Don't worry! Our AI companions are still learning. Try browsing all companions or adjusting your preferences.
                </p>
                <Button onClick={onBack}>
                  Adjust Preferences
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((companion, index) => (
                <Card 
                  key={companion.id} 
                  className={`relative overflow-hidden hover:shadow-lg transition-all cursor-pointer group ${
                    index === 0 ? 'ring-2 ring-primary ring-opacity-50' : ''
                  }`}
                  onClick={() => onSelectCompanion(companion)}
                >
                  {index === 0 && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="w-3 h-3 mr-1" />
                        Top Match
                      </Badge>
                    </div>
                  )}
                  
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img 
                      src={companion.image_url}
                      alt={companion.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`;
                      }}
                    />
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{companion.name}</h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getCompatibilityColor(companion.compatibilityScore)}`}>
                        {Math.round(companion.compatibilityScore * 100)}%
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <span>{companion.age} • {companion.gender}</span>
                      {companion.location && (
                        <>
                          <span className="mx-2">•</span>
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>{companion.location.split(',')[0]}</span>
                        </>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {companion.bio}
                    </p>
                    
                    <div className="mb-3">
                      <p className="text-xs font-medium text-primary mb-1">
                        {getCompatibilityLabel(companion.compatibilityScore)}
                      </p>
                      {companion.matchReasons.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {companion.matchReasons.slice(0, 2).map((reason, i) => (
                            <li key={i} className="flex items-start">
                              <span className="w-1 h-1 bg-primary rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {companion.hobbies.slice(0, 3).map(hobby => (
                        <Badge key={hobby} variant="secondary" className="text-xs">
                          {hobby}
                        </Badge>
                      ))}
                      {companion.hobbies.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{companion.hobbies.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};