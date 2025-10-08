import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  companionName: string;
  companionImage?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  companionName, 
  companionImage 
}) => {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex items-end space-x-2 max-w-[85%]">
        <Avatar className="w-8 h-8 border-2 border-primary/20">
          <AvatarImage 
            src={companionImage} 
            alt={companionName}
          />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {companionName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="rounded-2xl rounded-bl-none px-4 py-3 bg-muted/50 border border-primary/10">
          <div className="flex items-center space-x-1">
            <div 
              className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '1s' }}
            />
            <div 
              className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
              style={{ animationDelay: '200ms', animationDuration: '1s' }}
            />
            <div 
              className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
              style={{ animationDelay: '400ms', animationDuration: '1s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
