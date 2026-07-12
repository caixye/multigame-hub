"use client";

import { useEffect, useState } from "react";

interface NarrativePanelProps {
  text: string;
  type?: "werewolf" | "undercover";
}

export function NarrativePanel({ text, type = "werewolf" }: NarrativePanelProps) {
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [index, text]);

  const isWerewolf = type === "werewolf";

  return (
    <div
      className={`p-6 rounded-lg ${
        isWerewolf
          ? "narrative-panel border border-slate-700/50"
          : "undercover-theme border border-indigo-700/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{isWerewolf ? "🌙" : "🎭"}</span>
        <span className={`text-sm font-medium ${isWerewolf ? "text-slate-400" : "text-indigo-300"}`}>
          {isWerewolf ? "叙事" : "点评"}
        </span>
      </div>
      <p className="text-lg leading-relaxed text-white/90 min-h-[3em]">
        {displayText}
        {index < text.length && <span className="animate-pulse">|</span>}
      </p>
    </div>
  );
}
