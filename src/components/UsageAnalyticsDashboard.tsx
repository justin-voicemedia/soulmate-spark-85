import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Activity, Clock, MessageSquare, Zap, TrendingUp, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";

interface UsageStats {
  date: string;
  total_minutes_used: number;
  total_sessions: number;
  total_tokens_used: number;
  api_calls_made: number;
  total_cost_cents: number;
  voice_cost_cents: number;
  text_cost_cents: number;
}

interface UserUsageDetail {
  user_id: string;
  email: string;
  total_minutes: number;
  total_sessions: number;
  total_cost_cents: number;
}

export const UsageAnalyticsDashboard = () => {
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [topUsers, setTopUsers] = useState<UserUsageDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");
  const { toast } = useToast();

  useEffect(() => {
    loadUsageAnalytics();
  }, [timeRange]);

  const loadUsageAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      let startDate = new Date(0); // Beginning of time
      if (timeRange === "7d") {
        startDate = subDays(new Date(), 7);
      } else if (timeRange === "30d") {
        startDate = subDays(new Date(), 30);
      }

      // Load usage analytics
      const { data: stats, error: statsError } = await supabase
        .from("usage_analytics")
        .select("*")
        .gte("date", startDate.toISOString())
        .order("date", { ascending: false });

      if (statsError) throw statsError;
      setUsageStats(stats || []);

      // Load top users by usage
      const { data: usage, error: usageError } = await supabase
        .from("conversation_usage")
        .select(`
          user_id,
          minutes_used,
          calculated_cost_cents,
          profiles:user_id (
            email
          )
        `)
        .gte("session_start", startDate.toISOString());

      if (usageError) throw usageError;

      // Aggregate by user
      const userMap = new Map<string, UserUsageDetail>();
      usage?.forEach((record: any) => {
        const userId = record.user_id;
        const existing = userMap.get(userId) || {
          user_id: userId,
          email: record.profiles?.email || "Unknown",
          total_minutes: 0,
          total_sessions: 0,
          total_cost_cents: 0,
        };

        existing.total_minutes += record.minutes_used || 0;
        existing.total_sessions += 1;
        existing.total_cost_cents += record.calculated_cost_cents || 0;

        userMap.set(userId, existing);
      });

      const sortedUsers = Array.from(userMap.values())
        .sort((a, b) => b.total_cost_cents - a.total_cost_cents)
        .slice(0, 20);

      setTopUsers(sortedUsers);
    } catch (error: any) {
      console.error("Error loading usage analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load usage analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return usageStats.reduce(
      (acc, stat) => ({
        totalMinutes: acc.totalMinutes + stat.total_minutes_used,
        totalSessions: acc.totalSessions + stat.total_sessions,
        totalTokens: acc.totalTokens + stat.total_tokens_used,
        totalAPICalls: acc.totalAPICalls + stat.api_calls_made,
        totalCost: acc.totalCost + stat.total_cost_cents,
        voiceCost: acc.voiceCost + stat.voice_cost_cents,
        textCost: acc.textCost + stat.text_cost_cents,
      }),
      {
        totalMinutes: 0,
        totalSessions: 0,
        totalTokens: 0,
        totalAPICalls: 0,
        totalCost: 0,
        voiceCost: 0,
        textCost: 0,
      }
    );
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
        <TabsList>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals.totalMinutes.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {totals.totalSessions.toLocaleString()} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totals.totalTokens / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.totalAPICalls.toLocaleString()} API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Cost</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totals.voiceCost / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totals.voiceCost / totals.totalCost) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Text Cost</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totals.textCost / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totals.textCost / totals.totalCost) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Usage Breakdown
            </CardTitle>
            <CardDescription>Usage statistics by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {usageStats.map((stat) => (
                  <Card key={stat.date}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">
                          {format(new Date(stat.date), "MMM d, yyyy")}
                        </span>
                        <Badge>${(stat.total_cost_cents / 100).toFixed(2)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>Minutes: {stat.total_minutes_used}</div>
                        <div>Sessions: {stat.total_sessions}</div>
                        <div>Tokens: {(stat.total_tokens_used / 1000).toFixed(1)}K</div>
                        <div>API Calls: {stat.api_calls_made}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Users by Usage Cost
            </CardTitle>
            <CardDescription>Highest spending users in this period</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {topUsers.map((user, index) => (
                  <Card key={user.user_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="text-sm font-medium">{user.email}</span>
                        </div>
                        <Badge variant="default">
                          ${(user.total_cost_cents / 100).toFixed(2)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Minutes: {user.total_minutes}</div>
                        <div>Sessions: {user.total_sessions}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
