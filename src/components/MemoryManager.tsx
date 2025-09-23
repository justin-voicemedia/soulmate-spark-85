import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useMemoryManager } from '@/hooks/useMemoryManager';
import { Plus, Trash2, User, Briefcase, Heart, Calendar, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface PersonalProfile {
  family: { name: string; relationship: string; notes?: string }[];
  pets: { name: string; type: string; notes?: string }[];
  work: { company?: string; position?: string; industry?: string };
  importantDates: { date: string; type: string; description: string }[];
  preferences: {
    food: string[];
    activities: string[];
    places: string[];
  };
  currentEvents: { event: string; date: string; significance: string }[];
  basicInfo: {
    fullName?: string;
    nickname?: string;
    birthday?: string;
    location?: string;
    interests?: string[];
  };
}

interface MemoryManagerProps {
  companionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({ 
  companionId, 
  isOpen, 
  onClose 
}) => {
  const { getCompanionMemories, updatePersonalProfile, isProcessing } = useMemoryManager();
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && companionId) {
      loadMemories();
    }
  }, [isOpen, companionId]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const memories = await getCompanionMemories(companionId);
      setProfile(memories?.personalProfile || {
        family: [],
        pets: [],
        work: {},
        importantDates: [],
        preferences: { food: [], activities: [], places: [] },
        currentEvents: [],
        basicInfo: {}
      });
    } catch (error) {
      console.error('Error loading memories:', error);
      toast.error('Failed to load memory data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    await updatePersonalProfile(companionId, profile);
    onClose();
  };

  const addFamilyMember = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      family: [...profile.family, { name: '', relationship: '', notes: '' }]
    });
  };

  const addPet = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      pets: [...profile.pets, { name: '', type: '', notes: '' }]
    });
  };

  const addImportantDate = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      importantDates: [...profile.importantDates, { date: '', type: '', description: '' }]
    });
  };

  const addPreference = (category: 'food' | 'activities' | 'places', value: string) => {
    if (!profile || !value.trim()) return;
    
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [category]: [...profile.preferences[category], value.trim()]
      }
    });
  };

  const removePreference = (category: 'food' | 'activities' | 'places', index: number) => {
    if (!profile) return;
    
    const updated = [...profile.preferences[category]];
    updated.splice(index, 1);
    
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [category]: updated
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Memory Management
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isProcessing}>
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {loading ? (
            <div className="text-center py-8">Loading memory data...</div>
          ) : (
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="relationships">Relationships</TabsTrigger>
                <TabsTrigger value="work">Work & Life</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profile?.basicInfo?.fullName || ''}
                      onChange={(e) => setProfile(prev => prev ? {
                        ...prev,
                        basicInfo: { ...prev.basicInfo, fullName: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nickname">Preferred Name/Nickname</Label>
                    <Input
                      id="nickname"
                      value={profile?.basicInfo?.nickname || ''}
                      onChange={(e) => setProfile(prev => prev ? {
                        ...prev,
                        basicInfo: { ...prev.basicInfo, nickname: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={profile?.basicInfo?.birthday || ''}
                      onChange={(e) => setProfile(prev => prev ? {
                        ...prev,
                        basicInfo: { ...prev.basicInfo, birthday: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile?.basicInfo?.location || ''}
                      onChange={(e) => setProfile(prev => prev ? {
                        ...prev,
                        basicInfo: { ...prev.basicInfo, location: e.target.value }
                      } : null)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Important Dates</Label>
                  <div className="space-y-2 mt-2">
                    {profile?.importantDates.map((date, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="date"
                          value={date.date}
                          onChange={(e) => {
                            const updated = [...(profile?.importantDates || [])];
                            updated[index] = { ...updated[index], date: e.target.value };
                            setProfile(prev => prev ? { ...prev, importantDates: updated } : null);
                          }}
                        />
                        <Input
                          placeholder="Type (e.g., Anniversary)"
                          value={date.type}
                          onChange={(e) => {
                            const updated = [...(profile?.importantDates || [])];
                            updated[index] = { ...updated[index], type: e.target.value };
                            setProfile(prev => prev ? { ...prev, importantDates: updated } : null);
                          }}
                        />
                        <Input
                          placeholder="Description"
                          value={date.description}
                          onChange={(e) => {
                            const updated = [...(profile?.importantDates || [])];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setProfile(prev => prev ? { ...prev, importantDates: updated } : null);
                          }}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            const updated = [...(profile?.importantDates || [])];
                            updated.splice(index, 1);
                            setProfile(prev => prev ? { ...prev, importantDates: updated } : null);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={addImportantDate} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Important Date
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="relationships" className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4" />
                    <h3 className="font-semibold">Family & Friends</h3>
                  </div>
                  <div className="space-y-2">
                    {profile?.family.map((member, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Name"
                          value={member.name}
                          onChange={(e) => {
                            const updated = [...(profile?.family || [])];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setProfile(prev => prev ? { ...prev, family: updated } : null);
                          }}
                        />
                        <Input
                          placeholder="Relationship"
                          value={member.relationship}
                          onChange={(e) => {
                            const updated = [...(profile?.family || [])];
                            updated[index] = { ...updated[index], relationship: e.target.value };
                            setProfile(prev => prev ? { ...prev, family: updated } : null);
                          }}
                        />
                        <Input
                          placeholder="Notes"
                          value={member.notes || ''}
                          onChange={(e) => {
                            const updated = [...(profile?.family || [])];
                            updated[index] = { ...updated[index], notes: e.target.value };
                            setProfile(prev => prev ? { ...prev, family: updated } : null);
                          }}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            const updated = [...(profile?.family || [])];
                            updated.splice(index, 1);
                            setProfile(prev => prev ? { ...prev, family: updated } : null);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={addFamilyMember} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Family Member/Friend
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-4 h-4" />
                    <h3 className="font-semibold">Pets</h3>
                  </div>
                  <div className="space-y-2">
                    {profile?.pets.map((pet, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Pet Name"
                          value={pet.name}
                          onChange={(e) => {
                            const updated = [...(profile?.pets || [])];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setProfile(prev => prev ? { ...prev, pets: updated } : null);
                          }}
                        />
                        <Input
                          placeholder="Type (Dog, Cat, etc.)"
                          value={pet.type}
                          onChange={(e) => {
                            const updated = [...(profile?.pets || [])];
                            updated[index] = { ...updated[index], type: e.target.value };
                            setProfile(prev => prev ? { ...prev, pets: updated } : null);
                          }}
                        />
                        <Input
                          placeholder="Notes"
                          value={pet.notes || ''}
                          onChange={(e) => {
                            const updated = [...(profile?.pets || [])];
                            updated[index] = { ...updated[index], notes: e.target.value };
                            setProfile(prev => prev ? { ...prev, pets: updated } : null);
                          }}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            const updated = [...(profile?.pets || [])];
                            updated.splice(index, 1);
                            setProfile(prev => prev ? { ...prev, pets: updated } : null);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={addPet} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Pet
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="work" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4" />
                  <h3 className="font-semibold">Work Information</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profile?.work?.company || ''}
                      onChange={(e) => setProfile(prev => prev ? {
                        ...prev,
                        work: { ...prev.work, company: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position/Title</Label>
                    <Input
                      id="position"
                      value={profile?.work?.position || ''}
                      onChange={(e) => setProfile(prev => prev ? {
                        ...prev,
                        work: { ...prev.work, position: e.target.value }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={profile?.work?.industry || ''}
                      onChange={(e) => setProfile(prev => prev ? {
                        ...prev,
                        work: { ...prev.work, industry: e.target.value }
                      } : null)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                {(['food', 'activities', 'places'] as const).map((category) => (
                  <div key={category}>
                    <Label className="capitalize font-semibold">{category} Preferences</Label>
                    <div className="flex flex-wrap gap-2 mt-2 mb-2">
                      {profile?.preferences[category].map((item, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-2">
                          {item}
                          <button
                            onClick={() => removePreference(category, index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add ${category} preference`}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            addPreference(category, input.value);
                            input.value = '';
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={(e) => {
                          const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                          addPreference(category, input.value);
                          input.value = '';
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};