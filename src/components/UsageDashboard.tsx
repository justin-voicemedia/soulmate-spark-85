import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Clock, DollarSign, Phone, User, RefreshCw, TrendingUp } from 'lucide-react';
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

  const COST_PER_MINUTE = 0.10;

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
          <p className="text-muted-foreground">Track your voice chat usage and costs</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Trial Status */}
      {trialInfo.isTrialUser && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Trial Account</CardTitle>
            <CardDescription className="text-orange-600">
              You have {trialInfo.trialDaysRemaining} days remaining in your trial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Trial minutes used</span>
                <span>{trialInfo.trialMinutesUsed} / {trialInfo.trialMinutesLimit}</span>
              </div>
              <Progress value={trialProgress} className="h-2" />
              <p className="text-xs text-orange-600">
                {trialInfo.trialMinutesLimit - trialInfo.trialMinutesUsed} minutes remaining
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Minutes</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${usage.totalCost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
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

      {/* Today & This Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minutes</span>
                <span className="font-semibold">{usage.todayMinutes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-semibold">${usage.todayCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minutes</span>
                <span className="font-semibold">{usage.thisMonthMinutes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-semibold">${usage.thisMonthCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companion Breakdown */}
      {usage.companionBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage by Companion</CardTitle>
            <CardDescription>See how much time you've spent with each companion</CardDescription>
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
                  <Badge variant="secondary">
                    ${companion.cost.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pricing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate per minute</span>
              <span className="font-semibold">${COST_PER_MINUTE.toFixed(2)}</span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Voice chat usage is billed per minute. Partial minutes are rounded up to the nearest minute.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};