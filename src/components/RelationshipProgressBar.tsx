import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Heart, Sparkles, TrendingUp } from 'lucide-react';

interface RelationshipProgressBarProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalInteractions: number;
  compact?: boolean;
}

export const RelationshipProgressBar = ({
  level,
  xp,
  xpToNextLevel,
  totalInteractions,
  compact = false
}: RelationshipProgressBarProps) => {
  const progressPercentage = (xp / xpToNextLevel) * 100;

  const getLevelTitle = (lvl: number) => {
    if (lvl < 5) return 'Acquaintance';
    if (lvl < 10) return 'Friend';
    if (lvl < 15) return 'Close Friend';
    if (lvl < 20) return 'Best Friend';
    if (lvl < 30) return 'Soulmate';
    return 'Eternal Bond';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2">
        <div className="flex items-center gap-1 text-sm font-medium">
          <Heart className="w-4 h-4 text-primary" />
          <span>Lvl {level}</span>
        </div>
        <div className="flex-1">
          <Progress value={progressPercentage} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">
          {xp}/{xpToNextLevel} XP
        </span>
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Level {level}</h3>
            <p className="text-sm text-muted-foreground">{getLevelTitle(level)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>{totalInteractions} chats</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>{xp} XP</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress to Level {level + 1}</span>
          <span className="font-medium">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <p className="text-xs text-muted-foreground text-right">
          {xp} / {xpToNextLevel} XP
        </p>
      </div>
    </Card>
  );
};
