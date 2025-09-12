import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Clock, Phone, User, RefreshCw, TrendingUp, MessageSquare, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UsageStats {
  totalMinutes: number;
  totalCost: number;
  sessionsCount: number;
  avgSessionLength: number;
  todayMinutes: number;
  todayCost: number;
  thisMonthMinutes: number;
  thisMonthCost: number;
  companionBreakdown: {
    companionName: string;
    minutes: number;
    cost: number;
  }[];
  voiceStats: {
    minutes: number;
    cost: number;
    sessions: number;
    totalTokens: number;
  };
  textStats: {
    minutes: number;
    cost: number;
    sessions: number;
    totalTokens: number;
  };
  todayStats: {
    voice: { minutes: number };
    text: { minutes: number };
  };
  monthStats: {
    voice: { minutes: number };
    text: { minutes: number };
  };
}

interface TrialInfo {
  isTrialUser: boolean;
  trialMinutesUsed: number;
  trialMinutesLimit: number;
  trialDaysRemaining: number;
}

export const UsageDashboard: React.FC = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const fetchUsageData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-usage-stats', {
        body: { userId: user.id }
      });

      if (error) throw error;

      setUsage(data.usage);
      setTrialInfo(data.trial);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
      toast.error('Failed to load usage statistics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsageData();
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to view usage statistics</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading usage data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!usage || !trialInfo) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No usage data available</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const trialProgress = (trialInfo.trialMinutesUsed / trialInfo.trialMinutesLimit) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage Dashboard</h2>
          <p className="text-muted-foreground">Track your usage</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Trial Minutes Section */}
      {trialInfo.isTrialUser && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Trial Minutes
            </CardTitle>
            <CardDescription className="text-orange-600">
              You have {trialInfo.trialDaysRemaining} days remaining in your trial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-orange-800">{trialInfo.trialMinutesUsed}</p>
                  <p className="text-sm text-orange-600">Minutes Used</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-orange-800">{trialInfo.trialMinutesLimit - trialInfo.trialMinutesUsed}</p>
                  <p className="text-sm text-orange-600">Minutes Left</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-orange-800">{trialInfo.trialMinutesLimit}</p>
                  <p className="text-sm text-orange-600">Total Allowed</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Trial Progress</span>
                  <span>{Math.round(trialProgress)}%</span>
                </div>
                <Progress value={trialProgress} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Overview */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {trialInfo.isTrialUser ? 'Trial Usage Overview' : 'Usage Overview'}
        </h3>
      </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Minutes (all time)</p>
                  <p className="text-2xl font-bold">{usage.totalMinutes}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{usage.sessionsCount}</p>
                </div>
                <Phone className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Session</p>
                  <p className="text-2xl font-bold">{usage.avgSessionLength.toFixed(1)}m</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

      {/* API Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessions</span>
                <span className="font-semibold">{usage.voiceStats.sessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minutes</span>
                <span className="font-semibold">{usage.voiceStats.minutes}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Text Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessions</span>
                <span className="font-semibold">{usage.textStats.sessions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today & This Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Minutes</span>
                  <span className="font-semibold">{usage.todayMinutes}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Voice</p>
                  <p className="font-medium">{usage.todayStats.voice.minutes}m</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Text</p>
                  <p className="font-medium">{usage.todayStats.text.minutes}m</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Minutes</span>
                  <span className="font-semibold">{usage.thisMonthMinutes}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Voice</p>
                  <p className="font-medium">{usage.monthStats.voice.minutes}m</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Text</p>
                  <p className="font-medium">{usage.monthStats.text.minutes}m</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companion Breakdown */}
      {usage.companionBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage by Companion (current month)</CardTitle>
            <CardDescription>Minutes spent with each companion this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usage.companionBreakdown.map((companion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{companion.companionName}</p>
                      <p className="text-sm text-muted-foreground">{companion.minutes} minutes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};