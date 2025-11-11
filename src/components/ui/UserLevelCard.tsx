import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export default function UserLevelCard({ userId }) {
  const [levelData, setLevelData] = useState(null);

  useEffect(() => {
    fetch(`/api/levels/${userId}`)
      .then((res) => res.json())
      .then(setLevelData);
  }, [userId]);

  if (!levelData) return null;

  return (
    <Card className="p-6 text-center rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-2">Your Level</h2>
      <div className="text-5xl font-bold text-blue-600">Lv {levelData.level}</div>
      <p className="text-gray-500 mt-2">
        Total Score: <strong>{levelData.total_score}</strong>
      </p>
      <p className="text-gray-400 text-sm">
        🎓 Badges: {levelData.badges_count} | ⭐ Points: {levelData.points_sum}
      </p>
    </Card>
  );
}
