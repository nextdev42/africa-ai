import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then(setLeaders);
  }, []);

  return (
    <Card className="p-6 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">🏆 Leaderboard</h2>
      <ul>
        {leaders.map((user, i) => (
          <li key={user.user_id} className="flex justify-between border-b py-2">
            <span>
              {i + 1}. User {user.user_id.slice(0, 6)}...
            </span>
            <span className="text-blue-600 font-semibold">{user.total_score} pts</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
