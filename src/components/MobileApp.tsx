import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AvatarCustomizer } from "@/components/AvatarCustomizer";
import { supabase } from "@/integrations/supabase/client";
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Phone, 
  MessageCircle, 
  Send, 
  Heart, 
  Settings, 
  User,
  MapPin,
  Calendar,
  Mic,
  MicOff,
  Video,
  MoreVertical,
  Clock,
  AlertCircle,
  Crown,
  BarChart3,
  Trash2,
  ExternalLink,
  Smile,
  Flame,
  Menu
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemoryManager } from '@/hooks/useMemoryManager';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useRelationshipProgression } from "@/hooks/useRelationshipProgression";
import { useMoodTracking } from "@/hooks/useMoodTracking";
import { useEngagement } from "@/hooks/useEngagement";
import { OpenAIVoiceWidget } from "@/components/OpenAIVoiceWidget";
import { RelationshipSelector } from "@/components/RelationshipSelector";
import { VoiceSelector } from "@/components/VoiceSelector";
import { RelationshipProgressBar } from "@/components/RelationshipProgressBar";
import { RelationshipMilestones } from "@/components/RelationshipMilestones";
import { MoodTrendsChart } from "@/components/MoodTrendsChart";
import { MoodIndicator } from "@/components/MoodIndicator";
import { ConversationModeSelector } from "@/components/ConversationModeSelector";
import { DailyPrompt } from "@/components/DailyPrompt";
import { StreakDisplay } from "@/components/StreakDisplay";
import { GamificationHub } from "@/components/GamificationHub";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

// Import 3D icons
import profileIcon from "@/assets/icons/profile-3d.png";
import chatIcon from "@/assets/icons/chat-3d.png";
import voiceIcon from "@/assets/icons/voice-3d.png";
import settingsIcon from "@/assets/icons/settings-3d.png";

interface MobileAppProps {
  companion: {
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
  };
  onBack: () => void;
  onUpgrade?: () => void;
  onEditCompanion?: (companion: any) => void;
  onViewUsage?: () => void;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'companion';
  timestamp: Date;
}

export const MobileApp = ({ companion, onBack, onUpgrade, onEditCompanion, onViewUsage }: MobileAppProps) => {
  const { user, signOut } = useAuth();
  const { trialStatus, trackUsage, getRemainingMinutes, getRemainingDays, canUseService } = useTrialStatus();
  const { getCompanionMemories, generateContextPrompt, saveQuestionnaireToMemory } = useMemoryManager();
  const { addMessage: addToMemory, forceSave } = useConversationMemory(
    companion?.id, 
    companion?.name
  );
  const { stats, fetchStats, awardXP } = useRelationshipProgression();
  const { detectMoodFromText, trackMood, fetchMoodTrends, moodTrends } = useMoodTracking();
  const {
    dailyPrompt,
    streakData,
    fetchDailyPrompt,
    updateStreak
  } = useEngagement(user?.id, companion?.id);
  const [activeTab, setActiveTab] = useState<'chat' | 'profile' | 'settings' | 'voice'>('profile');
  const [isChatActive, setIsChatActive] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userCompanion, setUserCompanion] = useState<{ id: string; voice_id: string; relationship_type: string; conversation_mode: string } | null>(null);
  const [currentCompanion, setCurrentCompanion] = useState(companion);
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [currentMood, setCurrentMood] = useState<{ mood: string; intensity: number } | null>(null);

  const emojis = [
    '😀', '😃', '😄', '😁', '😊', '😉', '😍', '🥰', '😘', '😗',
    '🙂', '🤗', '🤩', '🤔', '🫡', '😏', '😣', '😥', '😮', '🤐',
    '😴', '😪', '🤤', '😋', '😛', '😝', '🤪', '🫠', '🙃', '😵‍💫',
    '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❣️', '💕',
    '💖', '💗', '💓', '💞', '💟', '♥️', '💔', '❤️‍🔥', '❤️‍🩹', '💯',
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
    '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👋', '🤚',
    '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟'
  ];

  // Check if running in mobile app
  useEffect(() => {
    const checkMobileApp = async () => {
      try {
        const info = await App.getInfo();
        setIsMobileApp(!!info.name); // If app info exists, we're in mobile app
      } catch {
        setIsMobileApp(false); // If error, we're in browser
      }
    };
    checkMobileApp();
  }, []);

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setIsEmojiOpen(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Force save conversation memory when component unmounts or companion changes  
  useEffect(() => {
    return () => {
      if (forceSave) {
        forceSave();
      }
    };
  }, [forceSave]);

  useEffect(() => {
    // Force save when switching companions
    if (forceSave) {
      forceSave();
    }
  }, [companion.id, forceSave]);

  // Update current companion when prop changes
  useEffect(() => {
    setCurrentCompanion(companion);
  }, [companion]);

  // Refresh companion data from database
  const refreshCompanionData = async () => {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('id', companion.id)
        .single();
      
      if (error) throw error;
      setCurrentCompanion(data);
    } catch (error) {
      console.error('Error refreshing companion data:', error);
    }
  };

  // Refresh companion data when component mounts or companion ID changes
  useEffect(() => {
    refreshCompanionData();
  }, [companion.id]);

  // Fetch user profile and conversation history
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setUserProfile(data);
    };

    const loadConversationHistory = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_companions')
          .select('conversation_history')
          .eq('user_id', user.id)
          .eq('companion_id', currentCompanion.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading conversation history:', error);
          return;
        }

        if (data?.conversation_history && Array.isArray(data.conversation_history)) {
          const history = data.conversation_history.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(history.length > 0 ? history : [
            {
              id: '1',
              content: `Hi ${user?.user_metadata?.name || 'there'}! I'm ${currentCompanion.name}. I'm so excited to get to know you better. How are you feeling today?`,
              sender: 'companion',
              timestamp: new Date()
            }
          ]);
        } else {
          // Set default welcome message if no history
          setMessages([
            {
              id: '1',
              content: `Hi ${user?.user_metadata?.name || 'there'}! I'm ${currentCompanion.name}. I'm so excited to get to know you better. How are you feeling today?`,
              sender: 'companion',
              timestamp: new Date()
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
      }
    };

    fetchProfile();
    loadConversationHistory();
  }, [user, companion.id]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_companions')
          .select('id, voice_id, relationship_type, conversation_mode')
          .eq('user_id', user.id)
          .eq('companion_id', currentCompanion.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setUserCompanion({
            id: data.id,
            voice_id: data.voice_id || 'alloy',
            relationship_type: data.relationship_type || 'casual_friend',
            conversation_mode: data.conversation_mode || 'casual',
          });
          // Fetch relationship progression stats
          fetchStats(data.id);
          // Fetch mood trends
          if (user) {
            fetchMoodTrends(user.id, currentCompanion.id, 7);
          }
        }
      } catch (e) {
        console.error('Error loading companion settings:', e);
      }
    };
    load();
  }, [user, companion.id, fetchStats, fetchMoodTrends]);

  useEffect(() => {
    // Don't auto-start session for chat tab, wait for Start Chat button
    // Session tracking is now handled in handleStartChat
  }, [activeTab]);

  // Track usage when leaving chat or component unmounts
  useEffect(() => {
    return () => {
      if (sessionStartTime) {
        const sessionDurationMs = new Date().getTime() - sessionStartTime.getTime();
        const sessionDurationMinutes = sessionDurationMs / (1000 * 60);
        if (sessionDurationMinutes > 0.1) { // Only track if more than 6 seconds
          trackUsage(currentCompanion.id, sessionDurationMinutes);
        }
      }
    };
  }, [sessionStartTime, companion.id, trackUsage]);

  const handleStartChat = () => {
    if (!canUseService()) {
      handleUpgradeRequest();
      return;
    }
    setIsChatActive(true);
    setSessionStartTime(new Date());
  };

  const handleUpgradeRequest = async () => {
    if (isMobileApp) {
      // In mobile app, redirect to website for payment
      toast.error("Trial expired or out of minutes. Redirecting to website for upgrade...");
      try {
        const websiteUrl = 'https://21462f3f-4956-4d89-ae71-737a989983a4.lovableproject.com';
        await Browser.open({ url: websiteUrl });
      } catch (error) {
        console.error('Failed to open website:', error);
        toast.error("Please visit our website to upgrade your subscription.");
      }
    } else {
      // In browser, use regular upgrade flow
      toast.error("Trial expired or out of minutes. Please upgrade to continue.");
      onUpgrade?.();
    }
  };

  const handleStopChat = () => {
    setIsChatActive(false);
    // Track usage when stopping chat
    if (sessionStartTime) {
      const sessionDurationMs = new Date().getTime() - sessionStartTime.getTime();
      const sessionDurationMinutes = sessionDurationMs / (1000 * 60);
      if (sessionDurationMinutes > 0.1) {
        trackUsage(currentCompanion.id, sessionDurationMinutes);
      }
      setSessionStartTime(null);
    }
    // Go back to profile page
    setActiveTab('profile');
  };

  const handleTabChange = (newTab: 'chat' | 'profile' | 'settings' | 'voice') => {
    // Track usage when leaving chat tab
    if (activeTab === 'chat' && sessionStartTime && newTab !== 'chat') {
      const sessionDurationMs = new Date().getTime() - sessionStartTime.getTime();
      const sessionDurationMinutes = sessionDurationMs / (1000 * 60);
      if (sessionDurationMinutes > 0.1) {
        trackUsage(currentCompanion.id, sessionDurationMinutes);
      }
      setSessionStartTime(null);
      setIsChatActive(false); // Reset chat state when leaving
    }
    
    // Start new session if switching to chat
    if (newTab === 'chat' && activeTab !== 'chat') {
      if (!canUseService()) {
        handleUpgradeRequest();
        return;
      }
      // Don't start session immediately for chat tab, wait for Start Chat button
    }
    
    setActiveTab(newTab);
  };

const handleVoiceChange = async (newVoiceId: string) => {
  if (!user) return;
  try {
    const { error } = await supabase
      .from('user_companions')
      .update({ voice_id: newVoiceId, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('companion_id', currentCompanion.id);
    if (error) throw error;
    setUserCompanion(prev => prev ? { ...prev, voice_id: newVoiceId } : prev);
    toast.success('Voice updated successfully');
  } catch (e) {
    console.error('Error updating voice:', e);
    toast.error('Failed to update voice');
  }
};

const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!canUseService()) {
      handleUpgradeRequest();
      return;
    }
    
    if (newMessage.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: 'user',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      const messageText = newMessage;
      setNewMessage('');

      // Add user message to memory system
      addToMemory('user', messageText);

      // Detect and track mood
      const detectedMood = detectMoodFromText(messageText);
      setCurrentMood(detectedMood);
      
      if (user && userCompanion?.id && detectedMood.mood !== 'neutral') {
        trackMood(
          user.id,
          currentCompanion.id,
          userCompanion.id,
          detectedMood.mood,
          detectedMood.intensity,
          messageText.substring(0, 100) // Store first 100 chars as context
        );
      }

      // Update streak on first message of the day
      await updateStreak();

      try {
        // Call OpenAI chat function with mood context
        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: {
            message: messageText,
            companionId: currentCompanion.id,
            conversationHistory: messages,
            userMood: detectedMood,
            conversationMode: userCompanion?.conversation_mode || 'casual'
          }
        });

        console.log('OpenAI Chat API Response:', { data, error });

        if (error) throw error;

        if (data?.success) {
          console.log('AI Response:', data.response);
          console.log('Conversation History:', data.conversationHistory);
          
          // Add assistant response to memory system
          addToMemory('assistant', data.response);
          
          // Use the updated conversation history from the API response
          // This ensures we stay in sync with the database
          if (data.conversationHistory && Array.isArray(data.conversationHistory)) {
            const updatedMessages = data.conversationHistory.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            console.log('Setting messages from conversation history:', updatedMessages);
            setMessages(updatedMessages);
          } else {
            // Fallback to manual message addition if no history returned
            console.log('Using fallback method to add AI message');
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: data.response,
              sender: 'companion',
              timestamp: new Date()
            };
            console.log('Adding AI message:', aiMessage);
            setMessages(prev => {
              const newMessages = [...prev, aiMessage];
              console.log('New messages array:', newMessages);
              return newMessages;
            });
          }
        } else {
          console.log('API response indicates failure:', data);
          throw new Error('Failed to get AI response');
        }
      } catch (error) {
        console.error('Chat error:', error);
        toast.error('Failed to send message. Please try again.');
        
        // Remove the user message on error
        setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
        setNewMessage(messageText); // Restore the message
      }
    }
  };

  const handleVoiceCall = () => {
    if (!canUseService()) {
      handleUpgradeRequest();
      return;
    }
    // Simulate voice call - would integrate with OpenAI Realtime API
    alert(`Calling ${currentCompanion.name}... This would connect to voice AI via OpenAI Realtime API`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const renderProfile = () => (
    <div className="flex flex-col h-full">
      {/* Companion Profile Header */}
      <div className="relative">
        <img 
          src={currentCompanion.image_url}
          alt={currentCompanion.name}
          className="w-full h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-2xl font-bold">{currentCompanion.name}</h1>
          <div className="flex items-center mt-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{currentCompanion.age} years old</span>
            <span className="mx-2">•</span>
            <span>{currentCompanion.gender}</span>
          </div>
          <div className="flex items-center mt-1">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{currentCompanion.location}</span>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Relationship Progress */}
        {stats && (
          <RelationshipProgressBar
            level={stats.level}
            xp={stats.xp}
            xpToNextLevel={stats.xpToNextLevel}
            totalInteractions={stats.totalInteractions}
          />
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={() => handleTabChange('chat')} 
            className="flex items-center justify-center h-16"
            disabled={!canUseService()}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Start Chat
          </Button>
          <Button 
            onClick={() => handleTabChange('voice')}
            variant="outline" 
            className="flex items-center justify-center h-16"
            disabled={!canUseService()}
          >
            <Mic className="w-5 h-5 mr-2" />
            Voice Chat
          </Button>
        </div>

        {/* Edit Companion Button */}
        {onEditCompanion && (
          <div className="w-full">
            <Button 
              onClick={() => onEditCompanion(currentCompanion)}
              variant="outline" 
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Companion Details
            </Button>
          </div>
        )}

        {/* Trial Status Alert */}
        {trialStatus && !trialStatus.subscribed && (
          <Alert className={getRemainingMinutes() < 50 ? "border-orange-200 bg-orange-50" : ""}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-semibold">Free Trial Active</div>
                <div className="text-sm">
                  {Math.floor(getRemainingDays())} days, {getRemainingMinutes()} minutes remaining
                </div>
                {getRemainingMinutes() < 50 && (
                  <Button 
                    size="sm" 
                    onClick={handleUpgradeRequest}
                    className="mt-2"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    {isMobileApp ? 'Upgrade on Website' : 'Upgrade Now'}
                    {isMobileApp && <ExternalLink className="w-3 h-3 ml-1" />}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Bio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About {currentCompanion.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{currentCompanion.bio}</p>
          </CardContent>
        </Card>

        {/* Hobbies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hobbies & Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentCompanion.hobbies.map(hobby => (
                <Badge key={hobby} variant="secondary">{hobby}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personality */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personality Traits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentCompanion.personality.map(trait => (
                <Badge key={trait} variant="outline">{trait}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Likes & Dislikes */}
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-700">What They Like</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentCompanion.likes.map(like => (
                  <Badge key={like} className="bg-green-100 text-green-800 hover:bg-green-200">
                    {like}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-700">What They Dislike</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentCompanion.dislikes.map(dislike => (
                  <Badge key={dislike} className="bg-red-100 text-red-800 hover:bg-red-200">
                    {dislike}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Relationship Milestones */}
        {stats && stats.milestones.length > 0 && (
          <RelationshipMilestones milestones={stats.milestones} />
        )}
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="relative flex flex-col h-full">
      {/* Ambient Background - Same as Voice Chat */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Top Section with Large Avatar - Matches Voice Chat */}
        <div className="flex-shrink-0 flex flex-col items-center justify-start p-6 space-y-4">
          <div className="relative mt-2">
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-xl"></div>
            <div className="relative">
              <img 
                src={companion.image_url} 
                alt={companion.name}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-contain object-center bg-background/50 backdrop-blur-sm border-4 border-primary/40 shadow-2xl shadow-primary/20 transition-all"
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`;
                }}
              />
              {/* Online badge */}
              <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-green-500/90 backdrop-blur-sm shadow-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-medium text-white">Online</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {companion.name}
            </h2>
          </div>

          {/* Primary action */}
          <div className="flex items-center gap-2">
            <Button
              onClick={isChatActive ? handleStopChat : handleStartChat}
              size="sm"
              className={isChatActive 
                ? 'bg-red-600 hover:bg-red-700 rounded-full' 
                : 'bg-green-600 hover:bg-green-700 rounded-full'}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {isChatActive ? 'Stop Chat' : 'Start Chat'}
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleVoiceCall}
              className="hover:bg-primary/10 rounded-full"
            >
              <Phone className="w-4 h-4 mr-2" />
              Voice Call
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleClearChat} 
              title="Clear chat"
              className="hover:bg-primary/10 rounded-full"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages - only when active */}
        {isChatActive && (
          <div className="flex-1 px-4 overflow-y-auto space-y-3 pb-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex animate-fade-in ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={`flex items-end space-x-2 max-w-[85%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {message.sender === 'companion' && (
                    <Avatar className="w-7 h-7 border-2 border-primary/20 shadow-md flex-shrink-0">
                      <AvatarImage src={companion.image_url} />
                      <AvatarFallback className="bg-primary/10 text-xs">{companion.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`px-4 py-3 rounded-2xl shadow-md transition-all ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                      : 'bg-background/80 backdrop-blur-sm border border-primary/10'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom input - only when active */}
      {isChatActive && (
        <div className="relative z-10 p-4 bg-background/80 backdrop-blur-xl border-t border-primary/10">
          <div className="max-w-md mx-auto">
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex items-center space-x-2 bg-background/50 rounded-full px-4 py-2 border border-primary/10 focus-within:border-primary/30 transition-colors shadow-lg">
                <Input
                  placeholder={`Message ${companion.name}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                />
                <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0 hover:bg-primary/10">
                      <Smile className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" side="top">
                    <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                      {emojis.map((emoji, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg hover:bg-accent"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`rounded-full h-8 w-8 p-0 ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'hover:bg-primary/10'}`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim()}
                className="rounded-full h-12 w-12 p-0 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderChatMessages = () => (
    <div className="relative flex flex-col h-full">
      {/* Ambient Background - Same as Voice Chat */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        
        {/* Top Section with Large Avatar - Same as Voice Chat */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center p-6 space-y-4">
          
          {/* Large Companion Avatar */}
          <div className="relative mt-4">
            {/* Subtle glow effect */}
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-xl"></div>
            
            {/* Main Avatar */}
            <div className="relative">
              <img 
                src={companion.image_url} 
                alt={companion.name}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-contain object-center bg-background/50 backdrop-blur-sm border-4 border-primary/40 shadow-2xl shadow-primary/20 transition-all duration-500"
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`;
                }}
              />

              {/* Online Status Badge */}
              <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-green-500/90 backdrop-blur-sm shadow-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-medium text-white">Online</span>
              </div>
            </div>
          </div>

          {/* Companion Name */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {companion.name}
            </h2>
            {currentMood && currentMood.mood !== 'neutral' && (
              <div className="flex justify-center mt-2">
                <MoodIndicator 
                  mood={currentMood.mood as any}
                  intensity={currentMood.intensity}
                  size="sm"
                  showLabel={true}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleVoiceCall}
              className="hover:bg-primary/10 rounded-full"
            >
              <Phone className="w-4 h-4 mr-2" />
              Voice Call
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleClearChat} 
              title="Clear chat"
              className="hover:bg-primary/10 rounded-full"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Conversation Mode Selector */}
          {userCompanion && (
            <div className="mt-3 px-4">
              <ConversationModeSelector
                userCompanionId={userCompanion.id}
                currentMode={userCompanion.conversation_mode}
                onModeChange={(mode) => setUserCompanion(prev => prev ? { ...prev, conversation_mode: mode } : prev)}
                compact={true}
              />
            </div>
          )}
        </div>

        {/* Engagement Features */}
        <div className="flex-shrink-0 px-4 pb-2 space-y-3">
          {streakData && (
            <StreakDisplay
              currentStreak={streakData.current_streak}
              longestStreak={streakData.longest_streak}
              totalDays={streakData.total_days_active}
            />
          )}
          
          {dailyPrompt && (
            <DailyPrompt
              prompt={dailyPrompt}
              onRefresh={fetchDailyPrompt}
              onUsePrompt={(promptText) => {
                setNewMessage(promptText);
              }}
            />
          )}
        </div>

        {/* Messages Area with Scroll */}
        <div className="flex-1 px-4 overflow-y-auto space-y-3 pb-4">{messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex animate-fade-in ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={`flex items-end space-x-2 max-w-[85%] ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                {message.sender === 'companion' && (
                  <Avatar className="w-7 h-7 border-2 border-primary/20 shadow-md flex-shrink-0">
                    <AvatarImage src={companion.image_url} />
                    <AvatarFallback className="bg-primary/10 text-xs">{companion.name[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`px-4 py-3 rounded-2xl shadow-md transition-all ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                    : 'bg-background/80 backdrop-blur-sm border border-primary/10'
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Area - Same as Voice Chat */}
      <div className="relative z-10 p-4 bg-background/80 backdrop-blur-xl border-t border-primary/10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center space-x-2">
            <div className="flex-1 flex items-center space-x-2 bg-background/50 rounded-full px-4 py-2 border border-primary/10 focus-within:border-primary/30 transition-colors shadow-lg">
              <Input
                placeholder={`Message ${companion.name}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRecording(!isRecording)}
                className={`rounded-full h-8 w-8 p-0 ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'hover:bg-primary/10'}`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>
            <Button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim()}
              className="rounded-full h-12 w-12 p-0 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="h-full overflow-y-auto p-4 space-y-6 pb-24">
      <div className="text-center">
        <div className="relative inline-block">
          <Avatar className="w-20 h-20 mx-auto mb-4">
            <AvatarImage src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
            <AvatarFallback><User className="w-8 h-8" /></AvatarFallback>
          </Avatar>
          <AvatarCustomizer 
            currentAvatarUrl={userProfile?.avatar_url}
            onAvatarUpdate={(avatarUrl) => setUserProfile({...userProfile, avatar_url: avatarUrl})}
          />
        </div>
        <h3 className="font-semibold">{user?.user_metadata?.name || 'User'}</h3>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Companion</CardTitle>
          <CardDescription>Currently connected to {companion.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('profile')}
            className="w-full"
          >
            View Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation Settings</CardTitle>
          <CardDescription>Configure how you chat with {companion.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mode" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="mode">Mode</TabsTrigger>
              <TabsTrigger value="relationship">Relationship</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
            </TabsList>
            <TabsContent value="mode" className="mt-4">
              {userCompanion && (
                <ConversationModeSelector
                  userCompanionId={userCompanion.id}
                  currentMode={userCompanion.conversation_mode}
                  onModeChange={(mode) => setUserCompanion(prev => prev ? { ...prev, conversation_mode: mode } : prev)}
                  compact={false}
                />
              )}
            </TabsContent>
            <TabsContent value="relationship" className="mt-4">
              {userCompanion && (
                <RelationshipSelector
                  companionId={companion.id}
                  companionName={companion.name}
                  currentRelationshipType={userCompanion.relationship_type || 'casual_friend'}
                  onRelationshipChange={(newType) => setUserCompanion(prev => prev ? { ...prev, relationship_type: newType } : prev)}
                  showTitle={false}
                />
              )}
            </TabsContent>
            <TabsContent value="voice" className="mt-4">
              {userCompanion && (
                <VoiceSelector
                  value={userCompanion.voice_id}
                  onValueChange={handleVoiceChange}
                  companionName={companion.name}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          {trialStatus?.subscribed ? (
            <CardDescription>
              {trialStatus.subscription_tier || 'Premium'} Plan - Active
            </CardDescription>
          ) : (
            <CardDescription>
              Free Trial - {Math.floor(getRemainingDays())} days, {getRemainingMinutes()} minutes remaining
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {trialStatus?.subscribed ? (
            <Badge className="bg-green-100 text-green-800">Active Subscription</Badge>
          ) : (
            <>
              <div className="space-y-2">
                <Badge variant="outline" className="text-blue-700 border-blue-200">
                  Free Trial
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <div>Days left: {Math.floor(getRemainingDays())}</div>
                  <div>Minutes left: {getRemainingMinutes()}</div>
                </div>
              </div>
              <Button 
                onClick={onUpgrade}
                className="w-full"
                variant={getRemainingMinutes() < 50 ? "default" : "outline"}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gamification Hub */}
      {user && (
        <GamificationHub
          userId={user.id}
          companionId={companion.id}
          companionName={companion.name}
          onStartChallenge={(prompt) => {
            setActiveTab('chat');
            setIsChatActive(true);
            setNewMessage(prompt);
          }}
        />
      )}

      {/* Mood Trends */}
      <MoodTrendsChart trends={moodTrends} days={7} />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={onViewUsage}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Heart className="w-4 h-4 mr-2" />
            Privacy Settings
          </Button>
          <Separator />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive" 
            onClick={signOut}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderVoice = () => (
    <div className="flex flex-col h-full">
      <OpenAIVoiceWidget 
        companionId={companion.id} 
        companionName={companion.name} 
        companionImage={companion.image_url}
      />
    </div>
  );

  return (
    <div className="h-screen max-w-md mx-auto bg-background flex flex-col">
      {/* Mobile App Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-md hover:bg-muted"
            onClick={onBack}
            title="Back to main site"
          >
            <Heart className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">LoveCalls.ai</span>
          </div>
          <div className="flex items-center space-x-2">
            {onViewUsage && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onViewUsage()}
                title="View usage dashboard"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'voice' && renderVoice()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Bottom Navigation - Modern Design */}
      <div className="relative border-t border-primary/10 bg-background/80 backdrop-blur-xl">
        {/* Active indicator bar */}
        <div 
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary to-primary/50 transition-all duration-300 rounded-full"
          style={{
            width: '25%',
            transform: `translateX(${
              activeTab === 'profile' ? '0%' : 
              activeTab === 'chat' ? '100%' : 
              activeTab === 'voice' ? '200%' : '300%'
            })`
          }}
        />
        <div className="grid grid-cols-4 p-2 gap-1">
          {/* Profile Tab */}
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-300 ${
              activeTab === 'profile' 
                ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 shadow-lg' 
                : 'hover:bg-muted/50'
            }`}
          >
            <div className={`relative ${activeTab === 'profile' ? 'scale-110' : ''} transition-transform duration-300`}>
              {/* Icon container with companion image */}
              <div className={`relative rounded-full p-0.5 transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700'
                  : 'bg-gradient-to-br from-purple-400/50 via-purple-500/40 to-purple-700/40'
              }`}
              style={{
                boxShadow: activeTab === 'profile' 
                  ? '0 4px 14px 0 rgba(168, 85, 247, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 0 20px rgba(168, 85, 247, 0.3)'
                  : '0 2px 8px 0 rgba(168, 85, 247, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <img 
                  src={companion.image_url} 
                  alt={companion.name}
                  className="w-11 h-11 rounded-full object-cover relative z-10 drop-shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${companion.name}`;
                  }}
                />
              </div>
              {activeTab === 'profile' && (
                <div className="absolute inset-0 bg-purple-500/40 blur-xl rounded-full" />
              )}
            </div>
            <span className={`text-xs font-medium mt-1 ${
              activeTab === 'profile' 
                ? 'text-purple-600 dark:text-purple-400' 
                : 'text-muted-foreground'
            }`}>
              Profile
            </span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => handleTabChange('chat')}
            disabled={!canUseService()}
            className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${
              activeTab === 'chat' 
                ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 shadow-lg' 
                : 'hover:bg-muted/50'
            }`}
          >
            <div className={`relative ${activeTab === 'chat' ? 'scale-110' : ''} transition-transform duration-300`}>
              <div className={`relative rounded-full p-1 transition-all duration-300 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700'
                  : 'bg-gradient-to-br from-blue-400/50 via-blue-500/40 to-blue-700/40'
              }`}
              style={{
                boxShadow: activeTab === 'chat' 
                  ? '0 4px 14px 0 rgba(59, 130, 246, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.2)'
                  : '0 2px 8px 0 rgba(59, 130, 246, 0.25), 0 1px 2px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <img 
                  src={chatIcon} 
                  alt="Chat" 
                  className="w-10 h-10 relative z-10 drop-shadow-lg"
                />
              </div>
              {activeTab === 'chat' && (
                <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full" />
              )}
            </div>
            <span className={`text-xs font-medium mt-1 ${
              activeTab === 'chat' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-muted-foreground'
            }`}>
              Chat
            </span>
          </button>

          {/* Voice Tab */}
          <button
            onClick={() => handleTabChange('voice')}
            disabled={!canUseService()}
            className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${
              activeTab === 'voice' 
                ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 shadow-lg' 
                : 'hover:bg-muted/50'
            }`}
          >
            <div className={`relative ${activeTab === 'voice' ? 'scale-110' : ''} transition-transform duration-300`}>
              <div className={`relative rounded-full p-1 transition-all duration-300 ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-700'
                  : 'bg-gradient-to-br from-green-400/50 via-green-500/40 to-green-700/40'
              }`}
              style={{
                boxShadow: activeTab === 'voice' 
                  ? '0 4px 14px 0 rgba(34, 197, 94, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.2)'
                  : '0 2px 8px 0 rgba(34, 197, 94, 0.25), 0 1px 2px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <img 
                  src={voiceIcon} 
                  alt="Voice" 
                  className="w-10 h-10 relative z-10 drop-shadow-lg"
                />
              </div>
              {activeTab === 'voice' && (
                <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full" />
              )}
            </div>
            <span className={`text-xs font-medium mt-1 ${
              activeTab === 'voice' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-muted-foreground'
            }`}>
              Voice
            </span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => handleTabChange('settings')}
            className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-300 ${
              activeTab === 'settings' 
                ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 shadow-lg' 
                : 'hover:bg-muted/50'
            }`}
          >
            <div className={`relative ${activeTab === 'settings' ? 'scale-110' : ''} transition-transform duration-300`}>
              <div className={`relative rounded-full p-1 transition-all duration-300 ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700'
                  : 'bg-gradient-to-br from-orange-400/50 via-orange-500/40 to-orange-700/40'
              }`}
              style={{
                boxShadow: activeTab === 'settings' 
                  ? '0 4px 14px 0 rgba(249, 115, 22, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.2)'
                  : '0 2px 8px 0 rgba(249, 115, 22, 0.25), 0 1px 2px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <img 
                  src={settingsIcon} 
                  alt="Settings" 
                  className="w-10 h-10 relative z-10 drop-shadow-lg"
                />
              </div>
              {activeTab === 'settings' && (
                <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-full" />
              )}
            </div>
            <span className={`text-xs font-medium mt-1 ${
              activeTab === 'settings' 
                ? 'text-orange-600 dark:text-orange-400' 
                : 'text-muted-foreground'
            }`}>
              Settings
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};