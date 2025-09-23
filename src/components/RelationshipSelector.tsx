import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Sparkles, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { toast } from 'sonner';

interface RelationshipSelectorProps {
  companionId: string;
  companionName: string;
  currentRelationshipType?: string;
  onRelationshipChange?: (newType: string) => void;
  showTitle?: boolean;
}

const relationshipTypes = [
  {
    id: 'casual_friend',
    name: 'Casual Friend',
    description: 'Light conversations, fun chats, share daily moments',
    icon: Users,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'romantic_partner',
    name: 'Romantic Partner',
    description: 'Deep emotional connection and romantic bond',
    icon: Heart,
    color: 'bg-red-100 text-red-800',
  },
  {
    id: 'spiritual_guide',
    name: 'Spiritual Guide',
    description: 'Explore mindfulness and spiritual growth together',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'intimate_companion',
    name: 'Intimate Companion',
    description: 'Share intimate moments and adult conversations (18+)',
    icon: Lock,
    color: 'bg-pink-100 text-pink-800',
  },
];

export const RelationshipSelector = ({
  companionId,
  companionName,
  currentRelationshipType = 'casual_friend',
  onRelationshipChange,
  showTitle = true,
}: RelationshipSelectorProps) => {
  const { user } = useAuth();
  const { trialStatus } = useTrialStatus();
  const [selectedType, setSelectedType] = useState(currentRelationshipType);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedType(currentRelationshipType);
  }, [currentRelationshipType]);

  const handleSaveRelationshipType = async () => {
    if (!user) {
      toast.error('Please sign in to change relationship type');
      return;
    }

    if (!trialStatus?.subscribed) {
      toast.error('Please subscribe to change relationship types');
      return;
    }

    if (selectedType === currentRelationshipType) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      // Update the user_companions table
      const { error } = await supabase
        .from('user_companions')
        .update({
          relationship_type: selectedType,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('companion_id', companionId);

      if (error) throw error;

      const relationshipName = relationshipTypes.find(t => t.id === selectedType)?.name;
      toast.success(`Relationship type updated to ${relationshipName}`);
      onRelationshipChange?.(selectedType);
    } catch (error) {
      console.error('Error updating relationship type:', error);
      toast.error('Failed to update relationship type. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!trialStatus) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading subscription status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!trialStatus.subscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Relationship Types - Premium Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Subscribe to unlock different relationship types and customize your connection with {companionName}.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {relationshipTypes.map((type) => (
                <div key={type.id} className="p-3 border rounded-lg bg-muted/50 relative">
                  <Lock className="h-4 w-4 absolute top-2 right-2 text-muted-foreground" />
                  <div className="flex items-center gap-2 mb-2">
                    <type.icon className="h-4 w-4" />
                    <span className="font-medium">{type.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              ))}
            </div>
            <Button className="mt-4">
              Subscribe to Unlock
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>Relationship Type with {companionName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to connect and interact with your companion.
          </p>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <RadioGroup value={selectedType} onValueChange={setSelectedType}>
          <div className="space-y-3">
            {relationshipTypes.map((type) => (
              <div key={type.id} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-secondary cursor-pointer transition-colors">
                <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                <Label htmlFor={type.id} className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <type.icon className="h-4 w-4" />
                    <span className="font-semibold">{type.name}</span>
                    {selectedType === type.id && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        {selectedType !== currentRelationshipType && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSaveRelationshipType}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedType(currentRelationshipType)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};