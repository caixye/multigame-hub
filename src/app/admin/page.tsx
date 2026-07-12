"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Users, DoorOpen, Brain, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState([
    { label: "注册用户", value: 0, icon: Users, color: "text-blue-400" },
    { label: "房间总数", value: 0, icon: DoorOpen, color: "text-green-400" },
    { label: "活跃游戏", value: 0, icon: Activity, color: "text-yellow-400" },
    { label: "AI 配置", value: "已就绪", icon: Brain, color: "text-purple-400" },
  ]);

  useEffect(() => {
    const t = document.cookie.match(/(?:^| )token=([^;]+)/)?.[1] || "";
    fetch("/api/rooms", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => res.json())
      .then((rooms) => {
        setStats((prev) => prev.map((s) => {
          if (s.label === "房间总数") return { ...s, value: rooms.length || 0 };
          if (s.label === "活跃游戏") return { ...s, value: rooms.filter((r: any) => r.status === "PLAYING").length || 0 };
          return s;
        }));
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">仪表盘</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 bg-slate-900/80 border-slate-700/50">
              <div className="flex items-center gap-3">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="p-6 bg-slate-900/80 border-slate-700/50">
        <h2 className="text-lg font-semibold text-white mb-4">系统状态</h2>
        <div className="space-y-2 text-sm text-slate-400">
          <p>• Cloudflare Pages Edge Runtime</p>
          <p>• 数据库：Cloudflare D1 (Drizzle ORM)</p>
          <p>• 实时通信：Durable Objects + WebSocket</p>
          <p>• 认证：JWT (jose) + bcryptjs</p>
        </div>
      </Card>
    </div>
  );
}
