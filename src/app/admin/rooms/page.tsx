"use client";

import { Card } from "@/components/ui/card";

export default function AdminRoomsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">房间管理</h1>
      <Card className="p-6 bg-slate-900/80 border-slate-700/50">
        <p className="text-slate-400">
          房间数据存储在 Durable Objects 中。通过 API 接口监控活跃房间。
          <br />使用 <code className="text-purple-400 bg-slate-800 px-1 rounded">GET /api/rooms</code> 获取房间列表。
        </p>
      </Card>
    </div>
  );
}
