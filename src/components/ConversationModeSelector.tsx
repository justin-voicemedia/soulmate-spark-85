import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Heart, Sparkles, HeartHandshake, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ConversationMode {
  mode_name: string;
  display_name: string;
  description: string;
  icon: string;
  prompt_modifier: string;
}

interface ConversationModeSelectorProps {
  userCompanionId: string;
  currentMode: string;
  onModeChange: (mode: string) => void;
  compact?: boolean;
}

const iconMap: Record<string, any> = {
  MessageCircle,
  Heart,
  Sparkles,
  HeartHandshake,
};

export const ConversationModeSelector = ({ 
  userCompanionId, 
  currentMode, 
  onModeChange,
  compact = false 
}: ConversationModeSelectorProps) => {
  const [modes, setModes] = useState<ConversationMode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(currentMode);

  useEffect(() => {
    fetchModes();
  }, []);

  useEffect(() => {
    setSelectedMode(currentMode);
  }, [currentMode]);

  const fetchModes = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_modes')
        .select('*')
        .order('mode_name');

      if (error) throw error;
      setModes(data || []);
    } catch (error) {
      console.error('Error fetching conversation modes:', error);
    }
  };

  const handleModeChange = async (modeName: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_companions')
        .update({ conversation_mode: modeName, updated_at: new Date().toISOString() })
        .eq('id', userCompanionId);

      if (error) throw error;

      setSelectedMode(modeName);
      onModeChange(modeName);
      
      toast.success('Conversation mode updated!', {
        description: `Switched to ${modes.find(m => m.mode_name === modeName)?.display_name} mode`
      });
    } catch (error) {
      console.error('Error updating conversation mode:', error);
      toast.error('Failed to update conversation mode');
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap justify-center">
        {modes.map((mode) => {
          const Icon = iconMap[mode.icon] || MessageCircle;
          const isActive = selectedMode === mode.mode_name;
          
          return (
            <Button
              key={mode.mode_name}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => handleModeChange(mode.mode_name)}
              disabled={isLoading}
              className={`transition-all ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              <Icon className="w-4 h-4 mr-1" />
              {mode.display_name}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        Conversation Mode
      </h3>
      
      <div className="grid grid-cols-1 gap-3">
        {modes.map((mode) => {
          const Icon = iconMap[mode.icon] || MessageCircle;
          const isActive = selectedMode === mode.mode_name;
          
          return (
            <button
              key={mode.mode_name}
              onClick={() => handleModeChange(mode.mode_name)}
              disabled={isLoading}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:scale-[1.02] ${
                isActive 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-muted hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{mode.display_name}</h4>
                    {isActive && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
