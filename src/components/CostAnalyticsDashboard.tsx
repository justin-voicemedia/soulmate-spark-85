import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  RefreshCw,
  Users,
  PieChart,
  BarChart3,
  Activity
} from 'lucide-react';

interface UserCostData {
  user_id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string;
  is_tester: boolean;
  current_month_cost_cents: number;
  current_month_sessions: number;
  current_month_minutes: number;
  current_month_voice_cost_cents: number;
  current_month_text_cost_cents: number;
  lifetime_cost_cents: number;
  avg_cost_per_session_cents: number;
  avg_cost_per_minute_cents: number;
  current_month_profit_cents: number;
}

interface ProfitabilitySummary {
  total_users: number;
  profitable_users: number;
  break_even_users: number;
  unprofitable_users: number;
  total_monthly_revenue_cents: number;
  total_monthly_costs_cents: number;
  total_monthly_profit_cents: number;
  average_profit_per_user_cents: number;
}

export const CostAnalyticsDashboard = () => {
  const [userCosts, setUserCosts] = useState<UserCostData[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculatingCosts, setCalculatingCosts] = useState(false);

  const loadCostData = async () => {
    setLoading(true);
    try {
      // Load user cost analytics
      const { data: costs, error: costsError } = await supabase
        .from('user_cost_analytics')
        .select('*')
        .order('current_month_cost_cents', { ascending: false });

      if (costsError) throw costsError;
      setUserCosts(costs || []);

      // Load profitability summary
      const { data: summary, error: summaryError } = await supabase
        .rpc('get_user_profitability_summary');

      if (summaryError) throw summaryError;
      if (summary && summary.length > 0) {
        setProfitSummary(summary[0]);
      }

    } catch (error) {
      console.error('Error loading cost data:', error);
      toast.error('Failed to load cost analytics');
    } finally {
      setLoading(false);
    }
  };

  const recalculateCosts = async () => {
    setCalculatingCosts(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-usage-costs', {
        body: { action: 'bulk_calculate' }
      });

      if (error) throw error;

      toast.success(`Updated cost calculations for ${data.updated_sessions} sessions`);
      await loadCostData(); // Refresh the data
    } catch (error) {
      console.error('Error recalculating costs:', error);
      toast.error('Failed to recalculate costs');
    } finally {
      setCalculatingCosts(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  const getProfitColor = (profitCents: number) => {
    if (profitCents > 100) return 'text-green-600 bg-green-50';
    if (profitCents > -100) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  useEffect(() => {
    loadCostData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Cost Analytics & Profitability
          </h2>
          <p className="text-muted-foreground">
            Track usage costs and profit margins per user
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadCostData} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={recalculateCosts}
            disabled={calculatingCosts}
          >
            <Calculator className={`w-4 h-4 mr-2 ${calculatingCosts ? 'animate-spin' : ''}`} />
            Recalculate Costs
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {profitSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(profitSummary.total_monthly_revenue_cents)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Costs</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(profitSummary.total_monthly_costs_cents)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-xl font-bold ${
                    profitSummary.total_monthly_profit_cents > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(profitSummary.total_monthly_profit_cents)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Profitable Users</p>
                  <p className="text-xl font-bold text-purple-600">
                    {profitSummary.profitable_users} / {profitSummary.total_users}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">User Costs</TabsTrigger>
          <TabsTrigger value="summary">Profitability Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Per User Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of usage costs and profitability by user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userCosts.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {userCosts.map((user) => (
                      <Card key={user.user_id} className="border">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* User Info */}
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{user.email}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {user.is_tester && (
                                    <Badge variant="secondary" className="text-xs">Tester</Badge>
                                  )}
                                  {user.subscribed ? (
                                    <Badge variant="default" className="text-xs">
                                      {user.subscription_tier}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">Trial</Badge>
                                  )}
                                </div>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded ${getProfitColor(user.current_month_profit_cents)}`}>
                                {formatCurrency(user.current_month_profit_cents)}
                              </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Month Cost</p>
                                <p className="font-medium text-red-600">
                                  {formatCurrency(user.current_month_cost_cents)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Sessions</p>
                                <p className="font-medium">{user.current_month_sessions}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Voice Cost</p>
                                <p className="font-medium">
                                  {formatCurrency(user.current_month_voice_cost_cents)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Text Cost</p>
                                <p className="font-medium">
                                  {formatCurrency(user.current_month_text_cost_cents)}
                                </p>
                              </div>
                            </div>

                            {/* Efficiency Metrics */}
                            <div className="pt-2 border-t text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost/Session:</span>
                                <span>{formatCurrency(user.avg_cost_per_session_cents)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost/Minute:</span>
                                <span>{formatCurrency(user.avg_cost_per_minute_cents)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No cost data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {profitSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    User Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-green-600">Profitable Users</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {profitSummary.profitable_users}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-600">Break-even Users</span>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        {profitSummary.break_even_users}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600">Unprofitable Users</span>
                      <Badge variant="default" className="bg-red-100 text-red-800">
                        {profitSummary.unprofitable_users}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Average Profit/User:</span>
                      <span className={`font-medium ${
                        profitSummary.average_profit_per_user_cents > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(profitSummary.average_profit_per_user_cents)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Margin:</span>
                      <span className={`font-medium ${
                        profitSummary.total_monthly_revenue_cents > 0 
                          ? (profitSummary.total_monthly_profit_cents / profitSummary.total_monthly_revenue_cents > 0 ? 'text-green-600' : 'text-red-600')
                          : 'text-gray-600'
                      }`}>
                        {profitSummary.total_monthly_revenue_cents > 0 
                          ? `${((profitSummary.total_monthly_profit_cents / profitSummary.total_monthly_revenue_cents) * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};