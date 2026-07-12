"use client";

import { Button } from "@/components/ui/button";

interface Player {
  userId: string;
  seatNumber: number;
  username: string;
  isAlive: boolean;
}

interface VotePanelProps {
  players: Player[];
  onVote: (targetId: string) => void;
  votedTarget?: string;
  disabled?: boolean;
}

export function VotePanel({ players, onVote, votedTarget, disabled = false }: VotePanelProps) {
  const alivePlayers = players.filter((p) => p.isAlive);

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400 mb-3">选择投票目标：</p>
      <div className="grid grid-cols-2 gap-2">
        {alivePlayers.map((player) => (
          <Button
            key={player.userId}
            variant={votedTarget === player.userId ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onVote(player.userId)}
            className={
              votedTarget === player.userId
                ? "bg-red-600 hover:bg-red-700"
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            {player.seatNumber}号 {player.username}
          </Button>
        ))}
      </div>
    </div>
  );
}
