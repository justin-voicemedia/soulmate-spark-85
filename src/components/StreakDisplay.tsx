import { Flame, Trophy, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
}

export const StreakDisplay = ({ currentStreak, longestStreak, totalDays }: StreakDisplayProps) => {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <Card className="p-3 bg-gradient-to-br from-orange-500/10 via-background to-background border-orange-500/20">
        <div className="flex flex-col items-center gap-1">
          <Flame className={`h-5 w-5 ${currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          <span className="text-2xl font-bold text-foreground">{currentStreak}</span>
          <span className="text-xs text-muted-foreground">Day Streak</span>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-yellow-500/10 via-background to-background border-yellow-500/20">
        <div className="flex flex-col items-center gap-1">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="text-2xl font-bold text-foreground">{longestStreak}</span>
          <span className="text-xs text-muted-foreground">Best Streak</span>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <div className="flex flex-col items-center gap-1">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold text-foreground">{totalDays}</span>
          <span className="text-xs text-muted-foreground">Total Days</span>
        </div>
      </Card>
    </div>
  );
};
