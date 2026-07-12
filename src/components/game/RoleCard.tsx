"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface RoleCardProps {
  role: string;
  roleName: string;
  description: string;
  overlay?: boolean; // 全屏遮罩模式
  onClose?: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  WEREWOLF: "from-red-900 to-red-950 border-red-700",
  SEER: "from-blue-900 to-blue-950 border-blue-700",
  WITCH: "from-green-900 to-green-950 border-green-700",
  HUNTER: "from-orange-900 to-orange-950 border-orange-700",
  VILLAGER: "from-slate-700 to-slate-900 border-slate-500",
  UNDERCOVER: "from-red-900 to-red-950 border-red-700",
  CIVILIAN: "from-green-900 to-green-950 border-green-700",
  BLANK: "from-purple-900 to-purple-950 border-purple-700",
};

const ROLE_ICONS: Record<string, string> = {
  WEREWOLF: "🐺",
  SEER: "🔮",
  WITCH: "🧪",
  HUNTER: "🏹",
  VILLAGER: "👤",
  UNDERCOVER: "🕵️",
  CIVILIAN: "😇",
  BLANK: "📋",
};

export function RoleCard({ role, roleName, description, overlay = false, onClose }: RoleCardProps) {
  const [flipped, setFlipped] = useState(false);

  const colorClass = ROLE_COLORS[role] || "from-slate-700 to-slate-900 border-slate-500";
  const icon = ROLE_ICONS[role] || "❓";

  const cardContent = (
    <div className="role-card-flip" style={{ perspective: "1000px" }}>
      <div className={cn("role-card-inner relative w-48 h-64", flipped && "flipped")}>
        {/* 正面 - 卡背 */}
        <div
          className={cn(
            "role-card-front absolute inset-0 rounded-xl border-2 bg-gradient-to-br cursor-pointer flex items-center justify-center",
            colorClass
          )}
          onClick={() => setFlipped(true)}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">?</div>
            <p className="text-white/50 text-sm">点击翻开</p>
          </div>
        </div>

        {/* 背面 - 角色信息 */}
        <div className="role-card-back absolute inset-0 rounded-xl border-2 bg-gradient-to-br flex flex-col items-center justify-center p-4 text-white"
             style={{ backgroundColor: "inherit" }}>
          <div className={cn("w-full h-full rounded-xl border-2 p-4 flex flex-col items-center justify-center bg-gradient-to-br", colorClass)}>
            <div className="text-5xl mb-3">{icon}</div>
            <h3 className="text-xl font-bold mb-1">{roleName}</h3>
            <p className="text-xs text-white/70 text-center">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>
          {cardContent}
          <p className="text-center text-white/50 mt-4 text-sm">点击卡背翻面查看角色</p>
        </div>
      </div>
    );
  }

  return cardContent;
}
