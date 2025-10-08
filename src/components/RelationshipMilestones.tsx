import { Card } from '@/components/ui/card';
import { Calendar, Award, Heart } from 'lucide-react';
import { format } from 'date-fns';

interface Milestone {
  text: string;
  date: string;
  level: number;
}

interface RelationshipMilestonesProps {
  milestones: Milestone[];
}

export const RelationshipMilestones = ({ milestones }: RelationshipMilestonesProps) => {
  if (milestones.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          No milestones yet. Keep chatting to create special moments!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Relationship Milestones</h3>
      </div>
      
      <div className="space-y-3">
        {milestones.slice().reverse().map((milestone, index) => (
          <div
            key={index}
            className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex-shrink-0 mt-1">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{milestone.text}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(milestone.date), 'MMM d, yyyy')}</span>
                <span>•</span>
                <span>Level {milestone.level}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
