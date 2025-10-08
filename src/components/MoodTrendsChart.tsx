import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MoodIndicator } from './MoodIndicator';
import { MoodType } from '@/hooks/useMoodTracking';

interface MoodTrend {
  mood_type: MoodType;
  count: number;
  avg_intensity: number;
}

interface MoodTrendsChartProps {
  trends: MoodTrend[];
  days?: number;
}

export const MoodTrendsChart = ({ trends, days = 7 }: MoodTrendsChartProps) => {
  if (trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mood Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No mood data yet. Keep chatting to track your emotional journey!
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...trends.map(t => t.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mood Insights (Last {days} Days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trends.map((trend) => {
          const percentage = (Number(trend.count) / maxCount) * 100;
          
          return (
            <div key={trend.mood_type} className="space-y-2">
              <div className="flex items-center justify-between">
                <MoodIndicator 
                  mood={trend.mood_type} 
                  intensity={Math.round(Number(trend.avg_intensity))}
                  size="sm"
                />
                <span className="text-sm text-muted-foreground">
                  {trend.count} {Number(trend.count) === 1 ? 'time' : 'times'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
