import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
}

interface UseConversationStorageProps {
  userId: string;
  companionId: string;
  userCompanionId: string;
  sessionId: string | null;
}

export const useConversationStorage = ({
  userId,
  companionId,
  userCompanionId,
  sessionId,
}: UseConversationStorageProps) => {
  const { toast } = useToast();
  const messageQueueRef = useRef<ConversationMessage[]>([]);
  const isSavingRef = useRef(false);

  const saveMessage = async (message: ConversationMessage) => {
    if (!sessionId) {
      console.warn("No session ID available, queueing message");
      messageQueueRef.current.push(message);
      return;
    }

    try {
      const { error } = await supabase.from("conversation_messages").insert({
        user_id: userId,
        companion_id: companionId,
        user_companion_id: userCompanionId,
        session_id: sessionId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving message:", error);
      // Queue for retry
      messageQueueRef.current.push(message);
    }
  };

  const saveMessageBatch = async (messages: ConversationMessage[]) => {
    if (!sessionId || messages.length === 0) return;

    try {
      const { error } = await supabase.from("conversation_messages").insert(
        messages.map((msg) => ({
          user_id: userId,
          companion_id: companionId,
          user_companion_id: userCompanionId,
          session_id: sessionId,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata || {},
        }))
      );

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving message batch:", error);
      toast({
        title: "Warning",
        description: "Some messages failed to save",
        variant: "destructive",
      });
    }
  };

  const flushQueue = async () => {
    if (
      !sessionId ||
      messageQueueRef.current.length === 0 ||
      isSavingRef.current
    ) {
      return;
    }

    isSavingRef.current = true;
    const messagesToSave = [...messageQueueRef.current];
    messageQueueRef.current = [];

    try {
      await saveMessageBatch(messagesToSave);
    } catch (error) {
      // Re-queue failed messages
      messageQueueRef.current.push(...messagesToSave);
    } finally {
      isSavingRef.current = false;
    }
  };

  // Flush queue when sessionId becomes available
  useEffect(() => {
    if (sessionId) {
      flushQueue();
    }
  }, [sessionId]);

  // Flush queue on unmount
  useEffect(() => {
    return () => {
      if (messageQueueRef.current.length > 0) {
        flushQueue();
      }
    };
  }, []);

  return {
    saveMessage,
    saveMessageBatch,
    flushQueue,
  };
};
