import { useState, useEffect } from "react";
import { LandingPage } from "@/components/LandingPage";
import { CompanionBrowser } from "@/components/CompanionBrowser";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { CompanionSettings } from "@/components/CompanionSettings";
import { Questionnaire } from "@/components/Questionnaire";
import { AuthForm } from "@/components/AuthForm";
import { PaymentForm } from "@/components/PaymentForm";
import { MobileApp } from "@/components/MobileApp";
import { AdminPanel } from "@/components/AdminPanel";
import { MatchResults } from "@/components/MatchResults";
import { UsageDashboard } from "@/components/UsageDashboard";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useMemoryManager } from "@/hooks/useMemoryManager";
import { CompanionMatchingService } from "@/services/companionMatching";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = 'landing' | 'questionnaire' | 'matches' | 'companions' | 'builder' | 'settings' | 'auth' | 'payment' | 'app' | 'admin' | 'edit-companion' | 'usage';

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
  const { saveQuestionnaireToMemory } = useMemoryManager();
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [editingCompanion, setEditingCompanion] = useState<Companion | null>(null);
  const [configuringCompanion, setConfiguringCompanion] = useState<Companion | null>(null);
  const [matches, setMatches] = useState<CompanionMatch[]>([]);
  const [matchingSummary, setMatchingSummary] = useState<string>('');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Auto-load companion for returning users
  useEffect(() => {
    const loadExistingCompanion = async () => {
      if (!user || initialLoadComplete) return;
      
      try {
        const { data: uc, error: ucError } = await supabase
          .from('user_companions')
          .select('companion_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!ucError && uc?.companion_id) {
          const { data: comp, error: compError } = await supabase
            .from('companions')
            .select('*')
            .eq('id', uc.companion_id)
            .maybeSingle();

          if (!compError && comp) {
            setSelectedCompanion(comp as Companion);
            setCurrentState('app');
          }
        }
      } catch (error) {
        console.error('Error loading existing companion:', error);
      } finally {
        setInitialLoadComplete(true);
      }
    };

    loadExistingCompanion();
  }, [user, initialLoadComplete]);

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
          onEditCompanion={(companion) => {
            setEditingCompanion(companion);
            setCurrentState('edit-companion');
          }}
          onViewUsage={() => setCurrentState('usage')}
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
    setCurrentState('questionnaire');
  };

  const handleSignIn = () => {
    setCurrentState('auth');
  };

  const handleQuestionnaireComplete = async (data: QuestionnaireData, companionId?: string) => {
    setQuestionnaireData(data);
    
    // If we have a selected companion (from browsing), save questionnaire data and proceed to auth
    if (selectedCompanion || companionId) {
      const targetCompanionId = companionId || selectedCompanion?.id;
      if (targetCompanionId && data.companionType) {
        // Save questionnaire responses to memory
        await saveQuestionnaireToMemory(
          targetCompanionId,
          data,
          data.companionType === 'casual' ? 'casual_friend' :
          data.companionType === 'romantic' ? 'romantic_partner' :
          data.companionType === 'spiritual' ? 'spiritual_guide' :
          data.companionType === 'intimate' ? 'intimate_companion' : 'casual_friend'
        );
      }
      setCurrentState('auth');
      return;
    }
    
    try {
      // Fetch all prebuilt companions for matching
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
    setCurrentState('questionnaire');
  };

  const handleAuthSuccess = async () => {
    // After auth, restore user's saved companion if available; never auto-change selection
    if (selectedCompanion) {
      setCurrentState('app');
      return;
    }

    if (!user) {
      setCurrentState('companions');
      return;
    }

    try {
      const { data: uc, error: ucError } = await supabase
        .from('user_companions')
        .select('companion_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ucError) {
        console.error('Error loading user companion:', ucError);
      }

      if (uc?.companion_id) {
        const { data: comp, error: compError } = await supabase
          .from('companions')
          .select('*')
          .eq('id', uc.companion_id)
          .maybeSingle();

        if (!compError && comp) {
          setSelectedCompanion(comp as Companion);
          setCurrentState('app');
          return;
        } else {
          console.error('Error loading companion details:', compError);
        }
      }

      // No saved companion; guide user to pick one
      setCurrentState('companions');
    } catch (e) {
      console.error('Error restoring companion on auth:', e);
      setCurrentState('companions');
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

  const handleCustomizeCompanion = (companion: Companion) => {
    setEditingCompanion(companion);
    setCurrentState('builder');
  };

  const handleConfigureCompanion = (companion: Companion) => {
    setConfiguringCompanion(companion);
    setCurrentState('settings');
  };

  const handleCompanionCreated = (companion: Companion) => {
    setSelectedCompanion(companion);
    
    // If we were editing, clear the editing state
    if (editingCompanion) {
      setEditingCompanion(null);
    }
    
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
        onBack={selectedCompanion ? () => setCurrentState('companions') : handleBackToLanding}
        onComplete={handleQuestionnaireComplete}
        selectedCompanion={selectedCompanion}
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
        onCustomizeCompanion={handleCustomizeCompanion}
        onConfigureCompanion={handleConfigureCompanion}
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

  if (currentState === 'settings') {
    return configuringCompanion ? (
      <CompanionSettings
        companionId={configuringCompanion.id}
        companionName={configuringCompanion.name}
        onBack={() => setCurrentState('companions')}
      />
    ) : null;
  }

  if (currentState === 'edit-companion') {
    return (
      <CompanionBuilder
        onBack={() => setCurrentState('app')}
        onCompanionCreated={handleCompanionCreated}
        editingCompanion={editingCompanion}
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
        onBack={handleBackToLanding}
      />
    );
  }

  // Usage dashboard
  if (currentState === 'usage') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4">
          <div className="mb-6">
            <button 
              onClick={() => setCurrentState('app')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to App
            </button>
          </div>
          <UsageDashboard />
        </div>
      </div>
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
