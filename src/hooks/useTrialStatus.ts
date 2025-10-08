import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TrialStatus {
  trial_active: boolean;
  trial_expired: boolean;
  trial_start: string | null;
  trial_minutes_used: number;
  trial_minutes_limit: number;
  subscribed: boolean;
  subscription_tier: string | null;
  is_tester: boolean;
}

export const useTrialStatus = () => {
  const { user, session } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const checkTrialStatus = async (force: boolean = false) => {
    if (!user || !session) return;
    
    // Cache for 5 minutes to avoid rate limits
    const CACHE_DURATION = 5 * 60 * 1000;
    const now = Date.now();
    
    if (!force && now - lastCheckTime < CACHE_DURATION && trialStatus) {
      console.log('Using cached subscription status');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking trial status:', error);
        return;
      }

      setTrialStatus(data);
      setLastCheckTime(now);
    } catch (error) {
      console.error('Error checking trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackUsage = async (companionId: string, minutesUsed: number, sessionId?: string) => {
    if (!user || !session) return;

    try {
      const { data, error } = await supabase.functions.invoke('track-usage', {
        body: {
          action: 'track',
          companionId,
          minutesUsed,
          apiType: 'text',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error tracking usage:', error);
        return;
      }

      // Only refresh trial status occasionally to avoid rate limits
      // Don't await it - let it happen in background
      checkTrialStatus(false);
      
      return data;
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  const getRemainingMinutes = () => {
    if (!trialStatus) return 0;
    return Math.max(0, trialStatus.trial_minutes_limit - trialStatus.trial_minutes_used);
  };

  const getRemainingDays = () => {
    if (!trialStatus?.trial_start) return 0;
    const trialStartDate = new Date(trialStatus.trial_start);
    const now = new Date();
    const daysSinceStart = (now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 7 - daysSinceStart);
  };

  const canUseService = () => {
    if (!trialStatus) return false;
    return trialStatus.subscribed || trialStatus.is_tester || (trialStatus.trial_active && getRemainingMinutes() > 0);
  };

  useEffect(() => {
    checkTrialStatus(true); // Force check on mount/user change
  }, [user, session]);

  return {
    trialStatus,
    loading,
    checkTrialStatus,
    trackUsage,
    getRemainingMinutes,
    getRemainingDays,
    canUseService,
  };
};