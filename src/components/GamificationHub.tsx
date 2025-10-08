import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Target } from "lucide-react";
import { AchievementsPanel } from "./AchievementsPanel";
import { DailyChallengeCard } from "./DailyChallengeCard";

interface GamificationHubProps {
  userId: string;
  companionId: string;
  companionName: string;
  onStartChallenge?: (prompt: string) => void;
}

export const GamificationHub = ({
  userId,
  companionId,
  companionName,
  onStartChallenge,
}: GamificationHubProps) => {
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Gamification & Progress
          </CardTitle>
          <CardDescription>
            Track your progress, complete challenges, and unlock achievements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardContent className="p-4 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm font-medium">Achievements</p>
                <Button
                  variant="link"
                  className="text-xs p-0 h-auto"
                  onClick={() => setAchievementsOpen(true)}
                >
                  View All
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-sm font-medium">Daily Challenge</p>
                <Button
                  variant="link"
                  className="text-xs p-0 h-auto"
                  onClick={() => setChallengeOpen(true)}
                >
                  View Today's
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setAchievementsOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Achievements
            </Button>
            <Button
              onClick={() => setChallengeOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Target className="h-4 w-4 mr-2" />
              Daily Challenge
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Dialog */}
      <Dialog open={achievementsOpen} onOpenChange={setAchievementsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Your Achievements
            </DialogTitle>
            <DialogDescription>
              Complete activities to unlock achievements and earn points
            </DialogDescription>
          </DialogHeader>
          <AchievementsPanel userId={userId} companionId={companionId} />
        </DialogContent>
      </Dialog>

      {/* Daily Challenge Dialog */}
      <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-500" />
              Daily Challenge
            </DialogTitle>
            <DialogDescription>
              Complete today's conversation challenge
            </DialogDescription>
          </DialogHeader>
          <DailyChallengeCard
            userId={userId}
            companionId={companionId}
            onStartChallenge={(prompt) => {
              setChallengeOpen(false);
              onStartChallenge?.(prompt);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
