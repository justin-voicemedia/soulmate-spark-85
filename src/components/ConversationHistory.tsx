import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, MessageSquare, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

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
  metadata: any;
}

interface ConversationHistoryProps {
  userId: string;
  companionId: string;
}

export const ConversationHistory = ({ userId, companionId }: ConversationHistoryProps) => {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, [userId, companionId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_conversation_sessions", {
        p_user_id: userId,
        p_companion_id: companionId,
        p_limit: 50,
      });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setSelectedSession(sessionId);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchConversations = async () => {
    if (!searchTerm.trim()) {
      loadSessions();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_conversation_history", {
        p_user_id: userId,
        p_companion_id: companionId,
        p_search_term: searchTerm,
        p_limit: 100,
      });

      if (error) throw error;
      setMessages(data || []);
      setSelectedSession(null);
    } catch (error: any) {
      console.error("Error searching:", error);
      toast({
        title: "Error",
        description: "Failed to search conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportConversation = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const exportData = {
        session_id: sessionId,
        exported_at: new Date().toISOString(),
        messages: data,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${sessionId}-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Conversation exported successfully",
      });
    } catch (error: any) {
      console.error("Error exporting:", error);
      toast({
        title: "Error",
        description: "Failed to export conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation History
          </CardTitle>
          <CardDescription>View past conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchConversations()}
            />
            <Button size="icon" variant="secondary" onClick={searchConversations}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[450px]">
            <div className="space-y-2">
              {sessions.map((session) => (
                <Card
                  key={session.session_id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedSession === session.session_id ? "border-primary" : ""
                  }`}
                  onClick={() => loadSessionMessages(session.session_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(session.session_start), "MMM d, yyyy")}
                      </div>
                      <Badge variant="secondary">
                        {session.message_count} msgs
                      </Badge>
                    </div>
                    <p className="text-sm line-clamp-2 mb-2">
                      {session.first_message || "No messages"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.minutes_used} min
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedSession ? "Conversation" : "Search Results"}
            </CardTitle>
            {selectedSession && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportConversation(selectedSession)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {loading ? "Loading..." : "Select a conversation to view messages"}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    <div
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={message.role === "user" ? "default" : "secondary"}>
                            {message.role}
                          </Badge>
                          <span className="text-xs opacity-70">
                            {format(new Date(message.created_at), "HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                    {index < messages.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
