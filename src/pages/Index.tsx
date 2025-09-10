import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { Questionnaire } from "@/components/Questionnaire";
import { CompanionBrowser } from "@/components/CompanionBrowser";
import { AuthForm } from "@/components/AuthForm";
import { PaymentForm } from "@/components/PaymentForm";
import { MobileApp } from "@/components/MobileApp";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

type AppState = 'landing' | 'questionnaire' | 'companions' | 'auth' | 'payment' | 'app';

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

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and has selected a companion, show the mobile app
  if (user && selectedCompanion) {
    return <MobileApp companion={selectedCompanion} onBack={() => setCurrentState('landing')} />;
  }

  const handleStartQuestionnaire = () => {
    setCurrentState('questionnaire');
  };

  const handleBrowseCompanions = () => {
    setCurrentState('companions');
  };

  const handleQuestionnaireComplete = (data: QuestionnaireData) => {
    setQuestionnaireData(data);
    setCurrentState('auth');
  };

  const handleCompanionSelect = (companion: Companion) => {
    setSelectedCompanion(companion);
    setCurrentState('auth');
  };

  const handleAuthSuccess = () => {
    setCurrentState('payment');
  };

  const handlePaymentSuccess = () => {
    // If we have a selected companion, go to app
    // Otherwise we need to generate one from questionnaire data
    if (selectedCompanion) {
      // User will see the mobile app since they're authenticated
    } else if (questionnaireData) {
      // Generate companion from questionnaire data
      const generatedCompanion: Companion = {
        id: 'custom-' + Date.now(),
        name: 'Alex', // Could use AI to generate based on preferences
        age: 28,
        gender: questionnaireData.gender,
        bio: `I'm Alex, created just for you based on your preferences. I love ${questionnaireData.hobbies.slice(0, 2).join(' and ')}.`,
        hobbies: questionnaireData.hobbies,
        personality: questionnaireData.personality,
        likes: ['Deep conversations', 'Meaningful connections'],
        dislikes: ['Superficial talk', 'Negativity'],
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        location: 'Virtual'
      };
      setSelectedCompanion(generatedCompanion);
    }
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

  if (currentState === 'auth') {
    return (
      <AuthForm
        onBack={handleBackToLanding}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (currentState === 'payment') {
    return (
      <PaymentForm
        onSuccess={handlePaymentSuccess}
      />
    );
  }

  return (
    <LandingPage
      onStartQuestionnaire={handleStartQuestionnaire}
      onBrowseCompanions={handleBrowseCompanions}
    />
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
