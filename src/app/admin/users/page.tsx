"use client";

import { Card } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">用户管理</h1>
      <Card className="p-6 bg-slate-900/80 border-slate-700/50">
        <p className="text-slate-400">
          用户管理功能请通过 D1 数据库直接管理，或使用 Cloudflare Dashboard。
          <br />运行 <code className="text-purple-400 bg-slate-800 px-1 rounded">wrangler d1 execute multigame --local --command='SELECT * FROM users'</code> 查看用户。
        </p>
      </Card>
    </div>
  );
}
