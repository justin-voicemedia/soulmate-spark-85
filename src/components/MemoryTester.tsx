import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemoryManager } from '@/hooks/useMemoryManager';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MemoryTester: React.FC = () => {
  const { user } = useAuth();
  const { saveConversationSummary, getCompanionMemories } = useMemoryManager();
  const [isProcessing, setIsProcessing] = useState(false);
  const [memories, setMemories] = useState<any>(null);

  const processExistingConversation = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      // Get the existing conversation
      const { data: userCompanion } = await supabase
        .from('user_companions')
        .select('conversation_history')
        .eq('user_id', user.id)
        .eq('companion_id', '41722b07-f138-4c23-ae59-ba276853b759')
        .maybeSingle();

      if (userCompanion?.conversation_history) {
        const conversationHistory = userCompanion.conversation_history as any[];
        
        // Convert to the format expected by saveConversationSummary
        const formattedConversation = conversationHistory.map((msg: any) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp
        }));

        console.log('Processing conversation with:', formattedConversation.length, 'messages');
        
        // Process the conversation
        await saveConversationSummary(
          '41722b07-f138-4c23-ae59-ba276853b759',
          formattedConversation,
          'Sophie'
        );
        
        toast.success('Conversation processed successfully!');
        
        // Load the resulting memories
        loadMemories();
      } else {
        toast.error('No conversation found to process');
      }
    } catch (error) {
      console.error('Error processing conversation:', error);
      toast.error('Failed to process conversation');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadMemories = async () => {
    try {
      const companionMemories = await getCompanionMemories('41722b07-f138-4c23-ae59-ba276853b759');
      setMemories(companionMemories);
      console.log('Loaded memories:', companionMemories);
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Memory System Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={processExistingConversation}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process Existing Conversation'}
          </Button>
          <Button 
            onClick={loadMemories}
            variant="outline"
          >
            Load Current Memories
          </Button>
        </div>
        
        {memories && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Current Memories:</h3>
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(memories, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};