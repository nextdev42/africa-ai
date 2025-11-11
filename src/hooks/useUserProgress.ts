// src/hooks/useUserProgress.ts
import { useEffect, useState } from 'react';

interface UserLevel {
  user_id: string;
  total_score: number;
  level: number;
  badges_count: number;
  points_sum: number;
  updated_at: string;
}

interface Badge {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  module_id: string;
  earned_at: string;
}

export function useUserProgress(userId: string | null) {
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProgress() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch user level
        const levelResponse = await fetch(`/api/levels/${userId}`);
        const levelData = await levelResponse.json();
        setUserLevel(levelData);

        // Fetch user badges
        const badgesResponse = await fetch(`/api/badges/${userId}`);
        const badgesData = await badgesResponse.json();
        setBadges(badgesData.error ? [] : badgesData);
      } catch (err) {
        console.error('Error fetching user progress:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserProgress();
  }, [userId]);

  return { userLevel, badges, loading };
}