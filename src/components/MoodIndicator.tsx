import { Card } from '@/components/ui/card';
import { Smile, Frown, Zap, Flame, Heart, Cloud, UserX, Sparkles, AlertCircle, Minus } from 'lucide-react';
import { MoodType } from '@/hooks/useMoodTracking';

interface MoodIndicatorProps {
  mood: MoodType;
  intensity?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MoodIndicator = ({ mood, intensity = 5, showLabel = true, size = 'md' }: MoodIndicatorProps) => {
  const getMoodConfig = (moodType: MoodType) => {
    const configs = {
      happy: {
        icon: Smile,
        color: 'text-yellow-500',
        bg: 'bg-yellow-100',
        label: 'Happy',
        emoji: '😊'
      },
      sad: {
        icon: Frown,
        color: 'text-blue-500',
        bg: 'bg-blue-100',
        label: 'Sad',
        emoji: '😢'
      },
      excited: {
        icon: Zap,
        color: 'text-orange-500',
        bg: 'bg-orange-100',
        label: 'Excited',
        emoji: '🤩'
      },
      anxious: {
        icon: AlertCircle,
        color: 'text-purple-500',
        bg: 'bg-purple-100',
        label: 'Anxious',
        emoji: '😰'
      },
      angry: {
        icon: Flame,
        color: 'text-red-500',
        bg: 'bg-red-100',
        label: 'Angry',
        emoji: '😠'
      },
      calm: {
        icon: Cloud,
        color: 'text-teal-500',
        bg: 'bg-teal-100',
        label: 'Calm',
        emoji: '😌'
      },
      lonely: {
        icon: UserX,
        color: 'text-gray-500',
        bg: 'bg-gray-100',
        label: 'Lonely',
        emoji: '😔'
      },
      loved: {
        icon: Heart,
        color: 'text-pink-500',
        bg: 'bg-pink-100',
        label: 'Loved',
        emoji: '🥰'
      },
      stressed: {
        icon: AlertCircle,
        color: 'text-amber-500',
        bg: 'bg-amber-100',
        label: 'Stressed',
        emoji: '😫'
      },
      neutral: {
        icon: Minus,
        color: 'text-gray-400',
        bg: 'bg-gray-50',
        label: 'Neutral',
        emoji: '😐'
      }
    };
    return configs[moodType];
  };

  const config = getMoodConfig(mood);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  if (!showLabel) {
    return (
      <div className={`${sizeClasses[size]} ${config.bg} ${config.color} rounded-full flex items-center justify-center`}>
        <Icon className={iconSize[size]} />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
      <div className={`${sizeClasses[size]} ${config.bg} ${config.color} rounded-full flex items-center justify-center flex-shrink-0`}>
        <Icon className={iconSize[size]} />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{config.label}</span>
        {intensity && (
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 h-2 rounded-full ${
                  i < intensity ? config.color.replace('text-', 'bg-') : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
