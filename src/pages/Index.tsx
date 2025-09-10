import { useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { Questionnaire } from "@/components/Questionnaire";
import { CompanionBrowser } from "@/components/CompanionBrowser";
import { AuthForm } from "@/components/AuthForm";
import { PaymentForm } from "@/components/PaymentForm";
import { MobileApp } from "@/components/MobileApp";
import { AdminPanel } from "@/components/AdminPanel";
import { MatchResults } from "@/components/MatchResults";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CompanionMatchingService } from "@/services/companionMatching";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = 'landing' | 'questionnaire' | 'matches' | 'companions' | 'builder' | 'auth' | 'payment' | 'app' | 'admin';

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

interface CompanionMatch extends Companion {
  compatibilityScore: number;
  matchReasons: string[];
}

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [matches, setMatches] = useState<CompanionMatch[]>([]);
  const [matchingSummary, setMatchingSummary] = useState<string>('');

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
  if (user && selectedCompanion && currentState === 'app') {
      return (
        <MobileApp 
          companion={selectedCompanion} 
          onBack={() => setCurrentState('landing')}
          onUpgrade={() => setCurrentState('payment')}
        />
      );
  }

  const handleStartQuestionnaire = () => {
    setCurrentState('questionnaire');
  };

  const handleBrowseCompanions = () => {
    setCurrentState('companions');
  };

  const handleBuildCompanion = () => {
    if (user) {
      setCurrentState('builder');
    } else {
      setCurrentState('auth');
    }
  };

  const handleSignIn = () => {
    setCurrentState('auth');
  };

  const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
    setQuestionnaireData(data);
    
    try {
      // Fetch all prebuilt companions
      const { data: companions, error } = await supabase
        .from('companions')
        .select('*')
        .eq('is_prebuilt', true);

      if (error) {
        console.error('Error fetching companions:', error);
        toast.error('Failed to load companions');
        setCurrentState('companions');
        return;
      }

      // Use matching service to find compatible companions
      const matchingService = new CompanionMatchingService();
      const compatibleMatches = matchingService.findMatches(data, companions || []);
      const summary = matchingService.getRecommendationSummary(data, compatibleMatches);

      setMatches(compatibleMatches);
      setMatchingSummary(summary);
      setCurrentState('matches');
      
    } catch (error) {
      console.error('Error during matching:', error);
      toast.error('Something went wrong. Let\'s browse all companions instead.');
      setCurrentState('companions');
    }
  };

  const handleCompanionSelect = (companion: Companion) => {
    setSelectedCompanion(companion);
    setCurrentState('auth');
  };

  const handleAuthSuccess = () => {
    // After auth, go directly to app if we have a companion, otherwise to payment
    if (selectedCompanion) {
      setCurrentState('app');
    } else {
      setCurrentState('payment');
    }
  };

  const handlePaymentSuccess = () => {
    // If we have a selected companion, go to app
    // Otherwise we need to generate one from questionnaire data
    if (selectedCompanion) {
      setCurrentState('app');
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
        image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        location: 'Virtual'
      };
      setSelectedCompanion(generatedCompanion);
    }
  };

  const handleBackToLanding = () => {
    setCurrentState('landing');
  };

  const handleCompanionCreated = (companion: Companion) => {
    setSelectedCompanion(companion);
    // Go directly to app - users can try before they pay
    if (user) {
      setCurrentState('app');
    } else {
      setCurrentState('auth');
    }
  };

  if (currentState === 'questionnaire') {
    return (
      <Questionnaire
        onBack={handleBackToLanding}
        onComplete={handleQuestionnaireComplete}
      />
    );
  }

  if (currentState === 'matches') {
    return (
      <MatchResults
        matches={matches}
        userData={questionnaireData!}
        onSelectCompanion={handleCompanionSelect}
        onBack={() => setCurrentState('questionnaire')}
        recommendationSummary={matchingSummary}
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

  if (currentState === 'builder') {
    return (
      <CompanionBuilder
        onBack={handleBackToLanding}
        onCompanionCreated={handleCompanionCreated}
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

  // Temporary admin mode - remove this in production  
  if (currentState === 'admin') {
    return <AdminPanel />;
  }

  return (
    <div>
      <LandingPage
        onStartQuestionnaire={handleStartQuestionnaire}
        onBrowseCompanions={handleBrowseCompanions}
        onBuildCompanion={handleBuildCompanion}
        onSignIn={handleSignIn}
      />
      {/* Temporary admin access - remove in production */}
      <div className="fixed bottom-4 right-4">
        <button 
          onClick={() => setCurrentState('admin')}
          className="bg-red-500 text-white px-3 py-1 rounded text-xs opacity-50 hover:opacity-100"
        >
          Admin
        </button>
      </div>
    </div>
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
