import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, User } from "lucide-react";
import { format } from "date-fns";

interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  customer_satisfaction_rating: number | null;
  profiles?: {
    email: string;
    name: string | null;
  };
}

export const SupportTicketManager = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("support_tickets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, name")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const ticketsWithProfiles = data.map(ticket => ({
          ...ticket,
          profiles: profileMap.get(ticket.user_id) || { email: "Unknown", name: null }
        }));

        setTickets(ticketsWithProfiles as SupportTicket[]);
      } else {
        setTickets([]);
      }
    } catch (error: any) {
      console.error("Error loading tickets:", error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "resolved" || newStatus === "closed") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket status updated",
      });

      loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      console.error("Error updating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      });
    }
  };

  const updateTicketPriority = async (ticketId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket priority updated",
      });

      loadTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
      });
    }
  };

  const addResolution = async () => {
    if (!selectedTicket || !resolution.trim()) return;

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          resolution: resolution,
          status: "resolved",
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resolution added and ticket marked as resolved",
      });

      setResolution("");
      loadTickets();
      setSelectedTicket(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add resolution",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "closed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const filterTicketsByStatus = (status?: string) => {
    if (!status) return tickets;
    return tickets.filter((t) => t.status === status);
  };

  const TicketList = ({ tickets }: { tickets: SupportTicket[] }) => (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className={`cursor-pointer transition-colors hover:bg-accent ${
              selectedTicket?.id === ticket.id ? "border-primary" : ""
            }`}
            onClick={() => setSelectedTicket(ticket)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  <span className="font-mono text-sm text-muted-foreground">
                    {ticket.ticket_number}
                  </span>
                </div>
                <Badge variant={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
              <h4 className="font-semibold mb-1">{ticket.subject}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {ticket.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ticket.profiles?.email}
                </div>
                <span>{format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Support Tickets
          </CardTitle>
          <CardDescription>Manage customer support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <TicketList tickets={tickets} />
            </TabsContent>
            <TabsContent value="open">
              <TicketList tickets={filterTicketsByStatus("open")} />
            </TabsContent>
            <TabsContent value="in_progress">
              <TicketList tickets={filterTicketsByStatus("in_progress")} />
            </TabsContent>
            <TabsContent value="resolved">
              <TicketList tickets={filterTicketsByStatus("resolved")} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ticket Details */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
          <CardDescription>
            {selectedTicket ? `Ticket ${selectedTicket.ticket_number}` : "Select a ticket"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedTicket ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge>{selectedTicket.status}</Badge>
                    <Badge variant={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                    {selectedTicket.category && (
                      <Badge variant="outline">{selectedTicket.category}</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Customer</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>{selectedTicket.profiles?.name || "Unknown"}</p>
                    <p>{selectedTicket.profiles?.email}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.resolution && (
                  <div>
                    <h4 className="font-semibold mb-2">Resolution</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedTicket.resolution}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Update Status</label>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Update Priority</label>
                    <Select
                      value={selectedTicket.priority}
                      onValueChange={(value) => updateTicketPriority(selectedTicket.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Add Resolution</label>
                      <Textarea
                        placeholder="Describe how this issue was resolved..."
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="mb-2"
                        rows={4}
                      />
                      <Button onClick={addResolution} className="w-full">
                        Save Resolution & Mark Resolved
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {format(new Date(selectedTicket.created_at), "PPpp")}</p>
                  <p>Updated: {format(new Date(selectedTicket.updated_at), "PPpp")}</p>
                  {selectedTicket.resolved_at && (
                    <p>
                      Resolved: {format(new Date(selectedTicket.resolved_at), "PPpp")}
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              Select a ticket to view details
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
