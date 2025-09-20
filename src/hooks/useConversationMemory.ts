import { useEffect, useRef } from 'react';
import { useMemoryManager } from './useMemoryManager';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export const useConversationMemory = (companionId?: string, companionName?: string) => {
  const { saveConversationSummary } = useMemoryManager();
  const conversationRef = useRef<ConversationMessage[]>([]);
  const lastSaveRef = useRef<Date>(new Date());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a message to the conversation
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    conversationRef.current.push(message);
    
    // Auto-save conversation summaries periodically
    scheduleAutoSave();
  };

  // Schedule an auto-save if enough time has passed or conversation is getting long
  const scheduleAutoSave = () => {
    if (!companionId || !companionName) return;
    
    const now = new Date();
    const timeSinceLastSave = now.getTime() - lastSaveRef.current.getTime();
    const conversationLength = conversationRef.current.length;
    
    // Save if:
    // - 10+ minutes have passed since last save, OR
    // - Conversation has 20+ messages, OR
    // - 5+ minutes have passed and there are 10+ messages
    const shouldSave = 
      timeSinceLastSave > 10 * 60 * 1000 || // 10 minutes
      conversationLength >= 20 ||
      (timeSinceLastSave > 5 * 60 * 1000 && conversationLength >= 10);
    
    if (shouldSave && conversationRef.current.length > 4) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Save after a short delay to batch messages
      saveTimeoutRef.current = setTimeout(() => {
        saveCurrentConversation();
      }, 2000);
    }
  };

  // Save the current conversation and reset
  const saveCurrentConversation = async () => {
    if (!companionId || !companionName || conversationRef.current.length < 4) return;
    
    try {
      console.log('Saving conversation summary...', {
        companionId,
        messageCount: conversationRef.current.length
      });
      
      await saveConversationSummary(
        companionId,
        conversationRef.current,
        companionName
      );
      
      // Reset conversation buffer and update last save time
      conversationRef.current = [];
      lastSaveRef.current = new Date();
      
      console.log('Conversation summary saved successfully');
    } catch (error) {
      console.error('Error saving conversation summary:', error);
    }
  };

  // Force save the current conversation (e.g., when user leaves)
  const forceSave = () => {
    if (conversationRef.current.length > 2) {
      saveCurrentConversation();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Force save on unmount if there's enough conversation
      if (conversationRef.current.length > 2) {
        forceSave();
      }
    };
  }, []);

  return {
    addMessage,
    forceSave,
    conversationLength: conversationRef.current.length
  };
};