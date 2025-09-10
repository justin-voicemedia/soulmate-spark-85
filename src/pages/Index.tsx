import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { Questionnaire } from "@/components/Questionnaire";
import { CompanionBrowser } from "@/components/CompanionBrowser";

type AppState = 'landing' | 'questionnaire' | 'companions' | 'signup';

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
  image: string;
  location: string;
}

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);

  const handleStartQuestionnaire = () => {
    setCurrentState('questionnaire');
  };

  const handleBrowseCompanions = () => {
    setCurrentState('companions');
  };

  const handleQuestionnaireComplete = (data: QuestionnaireData) => {
    setQuestionnaireData(data);
    // For now, just go to signup. Later this will generate a custom companion
    setCurrentState('signup');
  };

  const handleCompanionSelect = (companion: Companion) => {
    setSelectedCompanion(companion);
    setCurrentState('signup');
  };

  const handleBackToLanding = () => {
    setCurrentState('landing');
  };

  if (currentState === 'questionnaire') {
    return (
      <Questionnaire
        onBack={handleBackToLanding}
        onComplete={handleQuestionnaireComplete}
      />
    );
  }

  if (currentState === 'companions') {
    return (
      <CompanionBrowser
        onBack={handleBackToLanding}
        onSelectCompanion={handleCompanionSelect}
      />
    );
  }

  if (currentState === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-6">
        <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Connect!</h2>
          {selectedCompanion && (
            <p className="text-muted-foreground mb-4">
              You've selected {selectedCompanion.name} as your companion.
            </p>
          )}
          {questionnaireData && (
            <p className="text-muted-foreground mb-4">
              We'll create a perfect companion based on your preferences.
            </p>
          )}
          <p className="text-muted-foreground mb-6">
            Sign up now to start chatting and unlock the full LoveCalls.ai experience!
          </p>
          <p className="text-sm text-muted-foreground">
            Authentication and payment integration coming next...
          </p>
        </div>
      </div>
    );
  }

  return (
    <LandingPage
      onStartQuestionnaire={handleStartQuestionnaire}
      onBrowseCompanions={handleBrowseCompanions}
    />
  );
};

export default Index;
