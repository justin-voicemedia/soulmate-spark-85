import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Target, RefreshCw, Sparkles } from "lucide-react";

interface DailyPrompt {
  id: string;
  prompt_text: string;
  category: string;
  difficulty_level: string;
  tags: string[];
}

interface DailyChallengeCardProps {
  userId: string;
  companionId: string;
  onStartChallenge: (prompt: string) => void;
}

export const DailyChallengeCard = ({
  userId,
  companionId,
  onStartChallenge,
}: DailyChallengeCardProps) => {
  const [todaysPrompt, setTodaysPrompt] = useState<DailyPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDailyPrompt();
    checkIfCompleted();
  }, []);

  const loadDailyPrompt = async () => {
    try {
      setLoading(true);

      // Get today's date
      const today = new Date().toISOString().split("T")[0];

      // Check if user has a stored prompt for today
      const storageKey = `daily_prompt_${userId}_${today}`;
      const storedPrompt = localStorage.getItem(storageKey);

      if (storedPrompt) {
        setTodaysPrompt(JSON.parse(storedPrompt));
      } else {
        // Get a random prompt
        const { data, error } = await supabase
          .from("daily_prompts")
          .select("*")
          .limit(50);

        if (error) throw error;

        if (data && data.length > 0) {
          const randomPrompt = data[Math.floor(Math.random() * data.length)];
          setTodaysPrompt(randomPrompt);
          localStorage.setItem(storageKey, JSON.stringify(randomPrompt));

          // Update usage count
          await supabase
            .from("daily_prompts")
            .update({ usage_count: (randomPrompt.usage_count || 0) + 1 })
            .eq("id", randomPrompt.id);
        }
      }
    } catch (error: any) {
      console.error("Error loading daily prompt:", error);
      toast({
        title: "Error",
        description: "Failed to load daily challenge",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkIfCompleted = () => {
    const today = new Date().toISOString().split("T")[0];
    const completionKey = `daily_challenge_${userId}_${today}`;
    setCompleted(localStorage.getItem(completionKey) === "true");
  };

  const handleStartChallenge = () => {
    if (todaysPrompt) {
      onStartChallenge(todaysPrompt.prompt_text);

      // Mark as completed
      const today = new Date().toISOString().split("T")[0];
      const completionKey = `daily_challenge_${userId}_${today}`;
      localStorage.setItem(completionKey, "true");
      setCompleted(true);

      toast({
        title: "Challenge Started!",
        description: "Good luck with today's conversation topic!",
      });
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "hard":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading daily challenge...</p>
        </CardContent>
      </Card>
    );
  }

  if (!todaysPrompt) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No challenge available</p>
          <Button onClick={loadDailyPrompt} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={completed ? "border-green-500 bg-green-50/5" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Daily Challenge
        </CardTitle>
        <CardDescription>Complete today's conversation topic</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={getDifficultyColor(todaysPrompt.difficulty_level)}>
            {todaysPrompt.difficulty_level}
          </Badge>
          <Badge variant="outline">{todaysPrompt.category}</Badge>
          {completed && (
            <Badge className="bg-green-500">
              <Sparkles className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">{todaysPrompt.prompt_text}</p>
        </div>

        {todaysPrompt.tags && todaysPrompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {todaysPrompt.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Button
          onClick={handleStartChallenge}
          disabled={completed}
          className="w-full"
        >
          {completed ? "Challenge Completed!" : "Start Challenge"}
        </Button>

        {completed && (
          <p className="text-xs text-center text-muted-foreground">
            Come back tomorrow for a new challenge!
          </p>
        )}
      </CardContent>
    </Card>
  );
};
