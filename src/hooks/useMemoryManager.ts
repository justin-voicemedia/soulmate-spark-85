import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface QuestionnaireMemory {
  companionType: string;
  gender: string;
  ageRange: string;
  hobbies: string[];
  personality: string[];
  relationshipGoals: string;
  name: string;
  timestamp: string;
  [key: string]: any;
}

interface ConversationMemory {
  summary: string;
  keyTopics: string[];
  emotionalState: string;
  personalInfo: string[];
  relationshipNotes: string;
  futureReferences: string[];
  importantDates: string[];
  mood: string;
  timestamp: string;
  [key: string]: any;
}

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
  [key: string]: any;
}

interface CompanionMemories {
  questionnaire?: QuestionnaireMemory;
  conversations: ConversationMemory[];
  personalProfile?: PersonalProfile;
  lastInteraction?: string;
  relationshipMilestones: string[];
  [key: string]: any;
}

export const useMemoryManager = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const saveQuestionnaireToMemory = async (
    companionId: string, 
    questionnaireData: any,
    relationshipType?: string
  ) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    try {
      setIsProcessing(true);

      const questionnaireMemory: QuestionnaireMemory = {
        ...questionnaireData,
        timestamp: new Date().toISOString()
      };

      // Get existing user_companion record or create new one
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_companions')
        .select('*')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let customMemories: CompanionMemories = {
        conversations: [],
        relationshipMilestones: [],
        personalProfile: {
          family: [],
          pets: [],
          work: {},
          importantDates: [],
          preferences: { food: [], activities: [], places: [] },
          currentEvents: [],
          basicInfo: {}
        }
      };

      // If record exists, preserve existing memories
      if (existingRecord?.custom_memories) {
        customMemories = { ...customMemories, ...(existingRecord.custom_memories as CompanionMemories) };
      }

      // Add questionnaire data
      customMemories.questionnaire = questionnaireMemory;
      customMemories.lastInteraction = new Date().toISOString();

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_companions')
          .update({
            custom_memories: customMemories as Json,
            relationship_type: relationshipType || existingRecord.relationship_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('user_companions')
          .insert({
            user_id: user.id,
            companion_id: companionId,
            relationship_type: relationshipType || 'casual_friend',
            custom_memories: customMemories as Json
          });

        if (insertError) throw insertError;
      }

      toast.success('Preferences saved successfully');
      console.log('Questionnaire data saved to memory:', questionnaireMemory);

    } catch (error) {
      console.error('Error saving questionnaire to memory:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveConversationSummary = async (
    companionId: string,
    conversation: any[],
    companionName: string
  ) => {
    if (!user || !conversation || conversation.length === 0) return;

    try {
      setIsProcessing(true);

      // Get user's name from questionnaire or profile
      const { data: userCompanion } = await supabase
        .from('user_companions')
        .select('custom_memories')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      const memories = userCompanion?.custom_memories as CompanionMemories;
      const userName = memories?.questionnaire?.name || 'User';

      // Generate summary using the conversation summarizer
      const { data: summaryResponse, error: summaryError } = await supabase.functions.invoke(
        'conversation-summarizer',
        {
          body: {
            conversation,
            companionName,
            userName
          }
        }
      );

      if (summaryError) {
        console.error('Error generating summary:', summaryError);
        return;
      }

      const memorySummary = summaryResponse.memorySummary;

      // Update user_companion record with new memory
      const { data: currentRecord, error: fetchError } = await supabase
        .from('user_companions')
        .select('custom_memories')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching current memories:', fetchError);
        return;
      }

      let customMemories: CompanionMemories = {
        conversations: [],
        relationshipMilestones: [],
        personalProfile: {
          family: [],
          pets: [],
          work: {},
          importantDates: [],
          preferences: { food: [], activities: [], places: [] },
          currentEvents: [],
          basicInfo: {}
        }
      };

      if (currentRecord?.custom_memories) {
        customMemories = { ...customMemories, ...(currentRecord.custom_memories as CompanionMemories) };
      }

      // Add new conversation memory
      customMemories.conversations.push(memorySummary);
      customMemories.lastInteraction = new Date().toISOString();

      // Extract and merge structured data from conversation
      if (memorySummary.structuredData) {
        const structuredData = memorySummary.structuredData;
        
        // Merge family members
        if (structuredData.familyMembers?.length > 0) {
          structuredData.familyMembers.forEach((newMember: any) => {
            if (newMember.name && !customMemories.personalProfile?.family.some(f => f.name.toLowerCase() === newMember.name.toLowerCase())) {
              customMemories.personalProfile?.family.push({
                name: newMember.name,
                relationship: newMember.relationship || '',
                notes: newMember.notes || ''
              });
            }
          });
        }

        // Merge pets
        if (structuredData.pets?.length > 0) {
          structuredData.pets.forEach((newPet: any) => {
            if (newPet.name && !customMemories.personalProfile?.pets.some(p => p.name.toLowerCase() === newPet.name.toLowerCase())) {
              customMemories.personalProfile?.pets.push({
                name: newPet.name,
                type: newPet.type || '',
                notes: newPet.notes || ''
              });
            }
          });
        }

        // Merge work info
        if (structuredData.workInfo) {
          if (structuredData.workInfo.company && !customMemories.personalProfile?.work?.company) {
            customMemories.personalProfile!.work.company = structuredData.workInfo.company;
          }
          if (structuredData.workInfo.position && !customMemories.personalProfile?.work?.position) {
            customMemories.personalProfile!.work.position = structuredData.workInfo.position;
          }
          if (structuredData.workInfo.industry && !customMemories.personalProfile?.work?.industry) {
            customMemories.personalProfile!.work.industry = structuredData.workInfo.industry;
          }
        }

        // Merge preferences
        if (structuredData.preferences) {
          ['food', 'activities', 'places'].forEach(category => {
            if (structuredData.preferences[category]?.length > 0) {
              structuredData.preferences[category].forEach((pref: string) => {
                if (!customMemories.personalProfile?.preferences[category as keyof typeof customMemories.personalProfile.preferences].includes(pref)) {
                  customMemories.personalProfile?.preferences[category as keyof typeof customMemories.personalProfile.preferences].push(pref);
                }
              });
            }
          });
        }

        // Merge basic info
        if (structuredData.basicInfo) {
          if (structuredData.basicInfo.fullName && !customMemories.personalProfile?.basicInfo?.fullName) {
            customMemories.personalProfile!.basicInfo.fullName = structuredData.basicInfo.fullName;
          }
          if (structuredData.basicInfo.nickname && !customMemories.personalProfile?.basicInfo?.nickname) {
            customMemories.personalProfile!.basicInfo.nickname = structuredData.basicInfo.nickname;
          }
          if (structuredData.basicInfo.location && !customMemories.personalProfile?.basicInfo?.location) {
            customMemories.personalProfile!.basicInfo.location = structuredData.basicInfo.location;
          }
        }
      }

      // Keep only last 10 conversation summaries to prevent memory bloat
      if (customMemories.conversations.length > 10) {
        customMemories.conversations = customMemories.conversations.slice(-10);
      }

      // Update the record
      const { error: updateError } = await supabase
        .from('user_companions')
        .update({
          custom_memories: customMemories as Json,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('companion_id', companionId);

      if (updateError) {
        console.error('Error updating conversation memory:', updateError);
      } else {
        console.log('Conversation summary saved:', memorySummary);
      }

    } catch (error) {
      console.error('Error saving conversation summary:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCompanionMemories = async (companionId: string): Promise<CompanionMemories | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_companions')
        .select('custom_memories')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching companion memories:', error);
        return null;
      }

      return (data?.custom_memories as CompanionMemories) || null;
    } catch (error) {
      console.error('Error getting companion memories:', error);
      return null;
    }
  };

  const addRelationshipMilestone = async (companionId: string, milestone: string) => {
    if (!user) return;

    try {
      const memories = await getCompanionMemories(companionId);
      
      if (memories) {
        const updatedMemories = {
          ...memories,
          relationshipMilestones: [
            ...memories.relationshipMilestones,
            `${new Date().toISOString()}: ${milestone}`
          ],
          lastInteraction: new Date().toISOString()
        };

        const { error } = await supabase
          .from('user_companions')
          .update({
            custom_memories: updatedMemories as Json,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('companion_id', companionId);

        if (error) {
          console.error('Error adding relationship milestone:', error);
        } else {
          console.log('Relationship milestone added:', milestone);
        }
      }
    } catch (error) {
      console.error('Error adding relationship milestone:', error);
    }
  };

  const updatePersonalProfile = async (
    companionId: string, 
    profileUpdate: Partial<PersonalProfile>
  ) => {
    if (!user) return;

    try {
      const memories = await getCompanionMemories(companionId);
      
      if (memories) {
        const updatedProfile = {
          ...memories.personalProfile,
          ...profileUpdate
        };

        const updatedMemories = {
          ...memories,
          personalProfile: updatedProfile,
          lastInteraction: new Date().toISOString()
        };

        const { error } = await supabase
          .from('user_companions')
          .update({
            custom_memories: updatedMemories as Json,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('companion_id', companionId);

        if (error) {
          console.error('Error updating personal profile:', error);
          toast.error('Failed to update personal information');
        } else {
          toast.success('Personal information updated');
        }
      }
    } catch (error) {
      console.error('Error updating personal profile:', error);
      toast.error('Failed to update personal information');
    }
  };

  const generateContextPrompt = (memories: CompanionMemories): string => {
    if (!memories) return '';

    let contextPrompt = '\n**MEMORY CONTEXT:**\n';

    // Add questionnaire info
    if (memories.questionnaire) {
      const q = memories.questionnaire;
      contextPrompt += `**User Preferences:** ${q.name} is looking for ${q.companionType} companionship. They prefer ${q.relationshipGoals}. Age range: ${q.ageRange}. `;
      
      if (q.hobbies?.length > 0) {
        contextPrompt += `Hobbies: ${q.hobbies.join(', ')}. `;
      }
      
      if (q.personality?.length > 0) {
        contextPrompt += `Values these traits: ${q.personality.join(', ')}.\n`;
      }
    }

    // Add personal profile information
    if (memories.personalProfile) {
      const profile = memories.personalProfile;
      
      if (profile.basicInfo?.fullName) {
        contextPrompt += `\n**Personal Info:** User's name is ${profile.basicInfo.fullName}`;
        if (profile.basicInfo.nickname) {
          contextPrompt += ` (prefers to be called ${profile.basicInfo.nickname})`;
        }
        contextPrompt += '. ';
      }

      if (profile.basicInfo?.birthday) {
        contextPrompt += `Birthday: ${profile.basicInfo.birthday}. `;
      }

      if (profile.work?.company || profile.work?.position) {
        contextPrompt += `Work: ${profile.work.position || ''} ${profile.work.company ? `at ${profile.work.company}` : ''}. `;
      }

      if (profile.family?.length > 0) {
        contextPrompt += `Family: ${profile.family.map(f => `${f.name} (${f.relationship})`).join(', ')}. `;
      }

      if (profile.pets?.length > 0) {
        contextPrompt += `Pets: ${profile.pets.map(p => `${p.name} (${p.type})`).join(', ')}. `;
      }

      if (profile.preferences?.food?.length > 0) {
        contextPrompt += `Food preferences: ${profile.preferences.food.join(', ')}. `;
      }

      if (profile.importantDates?.length > 0) {
        contextPrompt += `\nImportant dates: ${profile.importantDates.map(d => `${d.description} on ${d.date}`).join(', ')}.\n`;
      }
    }

    // Add recent conversation summaries
    if (memories.conversations?.length > 0) {
      contextPrompt += `\n**Recent Conversations:**\n`;
      memories.conversations.slice(-3).forEach((conv, index) => {
        contextPrompt += `${index + 1}. ${conv.summary} (Mood: ${conv.mood})\n`;
        
        if (conv.personalInfo?.length > 0) {
          contextPrompt += `   Personal details: ${conv.personalInfo.join(', ')}\n`;
        }
        
        if (conv.futureReferences?.length > 0) {
          contextPrompt += `   Remember: ${conv.futureReferences.join(', ')}\n`;
        }
        
        if (conv.importantDates?.length > 0) {
          contextPrompt += `   Important dates: ${conv.importantDates.join(', ')}\n`;
        }
      });
    }

    // Add relationship milestones
    if (memories.relationshipMilestones?.length > 0) {
      contextPrompt += `\n**Relationship Milestones:**\n${memories.relationshipMilestones.slice(-5).join('\n')}\n`;
    }

    contextPrompt += '\n**Instructions:** Reference this context naturally in conversation. Build upon previous interactions and show growth in your relationship. Remember personal details and emotional states. Use specific names, dates, and preferences when relevant.\n';

    return contextPrompt;
  };

  return {
    saveQuestionnaireToMemory,
    saveConversationSummary,
    getCompanionMemories,
    addRelationshipMilestone,
    updatePersonalProfile,
    generateContextPrompt,
    isProcessing
  };
};
