"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  seconds: number;
  onEnd?: () => void;
  className?: string;
}

export function Countdown({ seconds, onEnd, className = "" }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          onEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onEnd]);

  // 圆环进度
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = ((seconds - timeLeft) / seconds) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width="100" height="100" className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        {/* 进度圆环 */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={timeLeft <= 10 ? "#ef4444" : "#8b5cf6"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          className="countdown-ring"
        />
      </svg>
      <span className={`absolute text-2xl font-bold ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}>
        {timeLeft}
      </span>
    </div>
  );
}
