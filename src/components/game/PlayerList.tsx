"use client";

import { cn } from "@/lib/utils";

interface Player {
  id: string;
  username: string;
  seatNumber: number;
  isReady?: boolean;
  isAlive?: boolean;
  isHost?: boolean;
  isCurrentUser?: boolean;
  role?: string; // 仅在游戏结束或自己是特殊角色时展示
}

interface PlayerListProps {
  players: Player[];
  showReady?: boolean;
  showAlive?: boolean;
  compact?: boolean;
}

export function PlayerList({
  players,
  showReady = false,
  showAlive = false,
  compact = false,
}: PlayerListProps) {
  return (
    <div className="space-y-1">
      {players.map((player) => (
        <div
          key={player.id}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
            player.isCurrentUser && "bg-purple-900/30",
            !player.isAlive && showAlive && "opacity-40 line-through",
            compact ? "text-xs py-1" : "text-sm"
          )}
        >
          {/* 座位号 */}
          <span className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            player.isAlive === false && showAlive
              ? "bg-slate-700 text-slate-500"
              : "bg-purple-600 text-white"
          )}>
            {player.seatNumber}
          </span>

          {/* 用户名 */}
          <span className="flex-1 truncate text-slate-300">
            {player.username}
            {player.isHost && (
              <span className="ml-1 text-yellow-500 text-xs" title="房主">👑</span>
            )}
            {player.isCurrentUser && (
              <span className="ml-1 text-purple-400 text-xs">(你)</span>
            )}
          </span>

          {/* 状态图标 */}
          {showReady && (
            <span className={cn(
              "w-2 h-2 rounded-full shrink-0",
              player.isReady ? "bg-green-500" : "bg-slate-600"
            )} />
          )}

          {showAlive && player.isAlive === false && (
            <span className="text-xs text-red-400 shrink-0">💀</span>
          )}

          {/* 角色标记（游戏结束后显示） */}
          {player.role && (
            <span className="text-xs text-slate-500 shrink-0">
              {ROLE_SHORT[player.role] || player.role}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** 角色简称 */
const ROLE_SHORT: Record<string, string> = {
  WEREWOLF: "狼",
  SEER: "预言",
  WITCH: "女巫",
  HUNTER: "猎人",
  VILLAGER: "民",
  UNDERCOVER: "卧底",
  CIVILIAN: "平民",
  BLANK: "白板",
};
