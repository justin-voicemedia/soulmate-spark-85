import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

interface DailyPromptProps {
  prompt: {
    prompt_text: string;
    category: string;
  } | null;
  onRefresh: () => void;
  onUsePrompt: (promptText: string) => void;
}

export const DailyPrompt = ({ prompt, onRefresh, onUsePrompt }: DailyPromptProps) => {
  if (!prompt) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/20 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">Today's Conversation Starter</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
              {prompt.category}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {prompt.prompt_text}
          </p>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              New Prompt
            </Button>
            <Button
              size="sm"
              onClick={() => onUsePrompt(prompt.prompt_text)}
              className="text-xs"
            >
              Use This
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
