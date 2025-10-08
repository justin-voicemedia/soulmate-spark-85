import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Memory {
  id: string;
  memory_key: string;
  memory_value: string;
  memory_type: string;
  category_id: string | null;
  category_name: string | null;
  tags: string[];
  importance: number;
  last_accessed_at: string | null;
  access_count: number;
}

export const useEnhancedMemory = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const getRelevantMemories = useCallback(async (
    companionId: string,
    searchContext?: string,
    limit: number = 10
  ): Promise<Memory[]> => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_memories', {
        p_user_id: user.id,
        p_companion_id: companionId,
        p_search_term: searchContext || null,
        p_category_id: null,
        p_tags: null
      });

      if (error) throw error;

      // Return top memories by importance and access frequency
      const memories = (data || []).slice(0, limit);
      
      // Record access for retrieved memories
      if (memories.length > 0) {
        for (const memory of memories) {
          await recordMemoryAccess(memory.id);
        }
      }

      return memories;
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const recordMemoryAccess = async (memoryId: string) => {
    try {
      await supabase.rpc('record_memory_access', {
        p_memory_id: memoryId
      });
    } catch (error) {
      console.error('Error recording memory access:', error);
    }
  };

  const buildMemoryContext = useCallback((memories: Memory[]): string => {
    if (memories.length === 0) return '';

    let context = '\n**MEMORY CONTEXT:**\n';
    
    // Group memories by category
    const categorized = memories.reduce((acc, memory) => {
      const category = memory.category_name || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(memory);
      return acc;
    }, {} as Record<string, Memory[]>);

    // Build context from categorized memories
    Object.entries(categorized).forEach(([category, mems]) => {
      context += `\n**${category}:**\n`;
      mems.forEach(mem => {
        context += `- ${mem.memory_key}: ${mem.memory_value}`;
        if (mem.tags && mem.tags.length > 0) {
          context += ` [${mem.tags.join(', ')}]`;
        }
        context += `\n`;
      });
    });

    return context;
  }, []);

  const addQuickMemory = useCallback(async (
    companionId: string,
    key: string,
    value: string,
    categoryId?: string,
    tags?: string[],
    importance: number = 5
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('companion_memories')
        .insert({
          user_id: user.id,
          companion_id: companionId,
          memory_key: key,
          memory_value: value,
          category_id: categoryId,
          tags: tags || [],
          importance,
          memory_type: 'auto_generated'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding quick memory:', error);
      return null;
    }
  }, [user]);

  return {
    isLoading,
    getRelevantMemories,
    buildMemoryContext,
    addQuickMemory,
    recordMemoryAccess
  };
};
