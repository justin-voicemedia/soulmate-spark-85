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
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { VoiceWidget } from "@/components/VoiceWidget";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState<'chat' | 'profile' | 'settings' | 'voice'>('profile');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hi ${user?.user_metadata?.name || 'there'}! I'm ${companion.name}. I'm so excited to get to know you better. How are you feeling today?`,
      sender: 'companion',
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user profile
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

    fetchProfile();
  }, [user]);

  useEffect(() => {
    // Start tracking session time when chat tab is opened
    if (activeTab === 'chat' && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [activeTab]);

  // Track usage when leaving chat or component unmounts
  useEffect(() => {
    return () => {
      if (sessionStartTime) {
        const sessionDurationMs = new Date().getTime() - sessionStartTime.getTime();
        const sessionDurationMinutes = sessionDurationMs / (1000 * 60);
        if (sessionDurationMinutes > 0.1) { // Only track if more than 6 seconds
          trackUsage(companion.id, sessionDurationMinutes);
        }
      }
    };
  }, [sessionStartTime, companion.id, trackUsage]);

  const handleTabChange = (newTab: 'chat' | 'profile' | 'settings' | 'voice') => {
    // Track usage when leaving chat tab
    if (activeTab === 'chat' && sessionStartTime && newTab !== 'chat') {
      const sessionDurationMs = new Date().getTime() - sessionStartTime.getTime();
      const sessionDurationMinutes = sessionDurationMs / (1000 * 60);
      if (sessionDurationMinutes > 0.1) {
        trackUsage(companion.id, sessionDurationMinutes);
      }
      setSessionStartTime(null);
    }
    
    // Start new session if switching to chat
    if (newTab === 'chat' && activeTab !== 'chat') {
      if (!canUseService()) {
        toast.error("Trial expired or out of minutes. Please upgrade to continue.");
        onUpgrade?.();
        return;
      }
      setSessionStartTime(new Date());
    }
    
    setActiveTab(newTab);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!canUseService()) {
      toast.error("Trial expired or out of minutes. Please upgrade to continue.");
      onUpgrade?.();
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
      setNewMessage('');

      // Simulate AI response
      setTimeout(() => {
        const responses = [
          "That's really interesting! Tell me more about that.",
          "I love hearing about your experiences. How did that make you feel?",
          "You have such a unique perspective on things. I really appreciate that about you.",
          "I've been thinking about what you said earlier. It really resonates with me.",
          "You always know how to make me smile! What's something that made you happy today?"
        ];
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: responses[Math.floor(Math.random() * responses.length)],
          sender: 'companion',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
      }, 1000 + Math.random() * 2000);
    }
  };

  const handleVoiceCall = () => {
    if (!canUseService()) {
      toast.error("Trial expired or out of minutes. Please upgrade to continue.");
      onUpgrade?.();
      return;
    }
    // Simulate voice call - would integrate with Twilio/Vapi.ai
    alert(`Calling ${companion.name}... This would connect to voice AI via Twilio/Vapi.ai`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderProfile = () => (
    <div className="flex flex-col h-full">
      {/* Companion Profile Header */}
      <div className="relative">
        <img 
          src={companion.image_url}
          alt={companion.name}
          className="w-full h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-2xl font-bold">{companion.name}</h1>
          <div className="flex items-center mt-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{companion.age} years old</span>
            <span className="mx-2">•</span>
            <span>{companion.gender}</span>
          </div>
          <div className="flex items-center mt-1">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{companion.location}</span>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
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
              onClick={() => onEditCompanion(companion)}
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
                    onClick={onUpgrade}
                    className="mt-2"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Upgrade Now
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Bio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About {companion.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{companion.bio}</p>
          </CardContent>
        </Card>

        {/* Hobbies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hobbies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {companion.hobbies.map(hobby => (
                <Badge key={hobby} variant="secondary">{hobby}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personality */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {companion.personality.map(trait => (
                <Badge key={trait} variant="outline">{trait}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Likes & Dislikes */}
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-700">Likes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {companion.likes.map(like => (
                  <Badge key={like} className="bg-green-100 text-green-800 hover:bg-green-200">
                    {like}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-700">Dislikes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {companion.dislikes.map(dislike => (
                  <Badge key={dislike} className="bg-red-100 text-red-800 hover:bg-red-200">
                    {dislike}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={companion.image_url} />
              <AvatarFallback>{companion.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{companion.name}</h3>
              <p className="text-sm text-muted-foreground">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={handleVoiceCall}>
              <Phone className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline">
              <Video className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-end space-x-2 max-w-[80%] ${
              message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              {message.sender === 'companion' && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={companion.image_url} />
                  <AvatarFallback>{companion.name[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={`px-4 py-2 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <div className="flex-1 flex items-center space-x-2">
            <Input
              placeholder={`Message ${companion.name}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRecording(!isRecording)}
              className={isRecording ? 'bg-red-100 text-red-600' : ''}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </div>
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-4 space-y-6">
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
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 flex items-center justify-center">
        <VoiceWidget 
          companionId={companion.id}
          companionName={companion.name}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen max-w-md mx-auto bg-background flex flex-col">
      {/* Mobile App Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onBack}
          >
            <Heart className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">LoveCalls</span>
          </div>
          <Button size="sm" variant="ghost">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'voice' && renderVoice()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t bg-card">
        <div className="grid grid-cols-4 p-2">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('profile')}
            className="flex flex-col items-center py-3"
          >
            <User className="w-4 h-4 mb-1" />
            <span className="text-xs">Profile</span>
          </Button>
          <Button
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('chat')}
            className="flex flex-col items-center py-3"
            disabled={!canUseService()}
          >
            <MessageCircle className="w-4 h-4 mb-1" />
            <span className="text-xs">Chat</span>
          </Button>
          <Button
            variant={activeTab === 'voice' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('voice')}
            className="flex flex-col items-center py-3"
            disabled={!canUseService()}
          >
            <Mic className="w-4 h-4 mb-1" />
            <span className="text-xs">Voice</span>
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('settings')}
            className="flex flex-col items-center py-3"
          >
            <Settings className="w-4 h-4 mb-1" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
};