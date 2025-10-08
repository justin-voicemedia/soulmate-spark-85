import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ConversationHistoryProps {
  userId: string;
  companionId: string;
}

interface ConversationSession {
  session_id: string;
  session_start: string;
  session_end: string | null;
  message_count: number;
  first_message: string | null;
  minutes_used: number;
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export const ConversationHistory = ({ userId, companionId }: ConversationHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["conversation-sessions", userId, companionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_conversation_sessions", {
        p_user_id: userId,
        p_companion_id: companionId,
        p_limit: 50,
      });
      if (error) throw error;
      return data as ConversationSession[];
    },
  });

  const { data: sessionMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["session-messages", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("session_id", selectedSession)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ConversationMessage[];
    },
    enabled: !!selectedSession,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["search-conversations", userId, companionId, searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];
      const { data, error } = await supabase.rpc("search_conversation_history", {
        p_user_id: userId,
        p_companion_id: companionId,
        p_search_term: searchTerm,
      });
      if (error) throw error;
      return data as ConversationMessage[];
    },
    enabled: searchTerm.length >= 3,
  });

  const exportConversation = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const conversationText = data
        .map((msg) => `[${format(new Date(msg.created_at), "PPpp")}] ${msg.role}: ${msg.content}`)
        .join("\n\n");

      const blob = new Blob([conversationText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${sessionId}-${format(new Date(), "yyyy-MM-dd")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Conversation exported successfully");
    } catch (error) {
      console.error("Error exporting conversation:", error);
      toast.error("Failed to export conversation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations (min 3 characters)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchTerm.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Results</CardTitle>
            <CardDescription>
              {searchLoading ? "Searching..." : `Found ${searchResults?.length || 0} messages`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {searchResults?.map((msg) => (
                  <div key={msg.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium capitalize">{msg.role}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "PPp")}
                      </span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Conversation Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation History
          </CardTitle>
          <CardDescription>View and replay your past conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <p className="text-muted-foreground">Loading conversations...</p>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-muted-foreground">No conversations yet</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedSession(session.session_id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(session.session_start), "PPP")}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportConversation(session.session_id);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {session.message_count} messages • {session.minutes_used} minutes
                    </p>
                    {session.first_message && (
                      <p className="text-sm truncate">{session.first_message}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Conversation Replay</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 p-4">
              {messagesLoading ? (
                <p className="text-muted-foreground">Loading messages...</p>
              ) : (
                sessionMessages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-muted mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">{msg.role}</span>
                      <span className="text-xs opacity-70">
                        {format(new Date(msg.created_at), "p")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
