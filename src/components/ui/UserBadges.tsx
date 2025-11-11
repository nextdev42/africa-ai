import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Award } from "lucide-react";

interface Badge {
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  module_id: string;
}

export default function UserBadges({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const response = await fetch(`/api/badges/${userId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else if (data.message) {
          setBadges([]); // no badges
        } else {
          setBadges(data);
        }
      } catch (err) {
        setError("Failed to load badges");
      } finally {
        setLoading(false);
      }
    }

    fetchBadges();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
        <span className="ml-2 text-gray-500">Loading badges...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  if (badges.length === 0) {
    return <p className="text-gray-500 text-center">No badges earned yet.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {badges.map((badge) => (
        <Card key={badge.module_id} className="shadow-md border rounded-2xl">
          <CardContent className="flex flex-col items-center text-center p-4">
            <div className="text-4xl mb-2">{badge.icon || <Award />}</div>
            <h3 className="text-lg font-semibold">{badge.name}</h3>
            <p className="text-gray-600 text-sm">{badge.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              Earned: {new Date(badge.earned_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
