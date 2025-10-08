import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Lock, Sparkles, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
  is_secret: boolean;
  rarity: string;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  achievements: Achievement;
}

interface AchievementsPanelProps {
  userId: string;
  companionId?: string;
}

export const AchievementsPanel = ({ userId, companionId }: AchievementsPanelProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAchievements();
    checkAchievements();
  }, [userId, companionId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);

      // Load all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("requirement_value", { ascending: true });

      if (achievementsError) throw achievementsError;

      // Load user's unlocked achievements
      let query = supabase
        .from("user_achievements")
        .select(`
          *,
          achievements (*)
        `)
        .eq("user_id", userId);

      if (companionId) {
        query = query.eq("companion_id", companionId);
      }

      const { data: userAch, error: userError } = await query;

      if (userError) throw userError;

      setAchievements(allAchievements || []);
      setUserAchievements(userAch || []);
    } catch (error: any) {
      console.error("Error loading achievements:", error);
      toast({
        title: "Error",
        description: "Failed to load achievements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAchievements = async () => {
    try {
      const { data, error } = await supabase.rpc("check_achievements", {
        p_user_id: userId,
        p_companion_id: companionId || null,
      });

      if (error) throw error;

      if (data && data[0]?.newly_unlocked) {
        const unlocked = JSON.parse(JSON.stringify(data[0].newly_unlocked));
        if (Array.isArray(unlocked) && unlocked.length > 0) {
          setNewlyUnlocked(unlocked as Achievement[]);
          (unlocked as Achievement[]).forEach((ach: Achievement) => {
            toast({
              title: "🎉 Achievement Unlocked!",
              description: `${ach.icon} ${ach.title} - ${ach.description}`,
            });
          });
          loadAchievements();
        }
      }
    } catch (error: any) {
      console.error("Error checking achievements:", error);
    }
  };

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some((ua) => ua.achievement_id === achievementId);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-yellow-500 to-orange-500";
      case "epic":
        return "from-purple-500 to-pink-500";
      case "rare":
        return "from-blue-500 to-cyan-500";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  const getRarityBadgeVariant = (rarity: string): any => {
    switch (rarity) {
      case "legendary":
        return "destructive";
      case "epic":
        return "default";
      case "rare":
        return "secondary";
      default:
        return "outline";
    }
  };

  const filterByCategory = (category?: string) => {
    if (!category) return achievements;
    return achievements.filter((a) => a.category === category);
  };

  const calculateProgress = (achievement: Achievement) => {
    const userAch = userAchievements.find((ua) => ua.achievement_id === achievement.id);
    if (userAch) return 100;
    return 0;
  };

  const totalPoints = userAchievements.reduce(
    (sum, ua) => sum + (ua.achievements?.points || 0),
    0
  );

  const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
    const unlocked = isUnlocked(achievement.id);
    const progress = calculateProgress(achievement);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className={`relative overflow-hidden ${
            unlocked ? "border-primary" : "opacity-60"
          }`}
        >
          {unlocked && (
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getRarityColor(
                achievement.rarity
              )}`}
            />
          )}
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{unlocked ? achievement.icon : "🔒"}</div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    {unlocked ? achievement.title : "???"}
                    {!unlocked && achievement.is_secret && <Lock className="h-3 w-3" />}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {unlocked || !achievement.is_secret
                      ? achievement.description
                      : "Secret achievement - keep playing to unlock!"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={getRarityBadgeVariant(achievement.rarity)}>
                  {achievement.rarity}
                </Badge>
                <Badge variant="outline">{achievement.points} pts</Badge>
              </div>
            </div>

            {!unlocked && !achievement.is_secret && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>
                    0 / {achievement.requirement_value}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {unlocked && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>
                  Unlocked{" "}
                  {new Date(
                    userAchievements.find((ua) => ua.achievement_id === achievement.id)
                      ?.unlocked_at || ""
                  ).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Your Achievements
          </CardTitle>
          <CardDescription>
            {userAchievements.length} / {achievements.length} unlocked • {totalPoints} total
            points
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Achievement Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="conversation">Chat</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="relationship">Love</TabsTrigger>
          <TabsTrigger value="milestone">Milestone</TabsTrigger>
          <TabsTrigger value="special">Special</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ScrollArea className="h-[600px]">
            <div className="grid gap-4">
              {achievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {["conversation", "streak", "relationship", "milestone", "special"].map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <ScrollArea className="h-[600px]">
              <div className="grid gap-4">
                {filterByCategory(category).map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* Newly Unlocked Animation */}
      <AnimatePresence>
        {newlyUnlocked.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setNewlyUnlocked([])}
          >
            <Card className="max-w-md">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">{newlyUnlocked[0].icon}</div>
                <h2 className="text-2xl font-bold mb-2">Achievement Unlocked!</h2>
                <h3 className="text-xl font-semibold mb-2">{newlyUnlocked[0].title}</h3>
                <p className="text-muted-foreground mb-4">{newlyUnlocked[0].description}</p>
                <Badge className="text-lg px-4 py-2">+{newlyUnlocked[0].points} points</Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
