"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        // 将 token 存入 Cookie
        document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        router.push("/lobby");
      } else {
        setError(data.message || "登录失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md p-8 bg-slate-900/80 border-slate-700/50 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">MultiGame Hub</h1>
          <p className="text-slate-400">登录游戏大厅</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-slate-300">用户名</Label>
            <Input id="username" type="text" value={username}
              onChange={(e) => setUsername(e.target.value)} required
              className="mt-1 bg-slate-800 border-slate-600 text-white" placeholder="请输入用户名" />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-300">密码</Label>
            <Input id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="mt-1 bg-slate-800 border-slate-600 text-white" placeholder="请输入密码" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
        <p className="mt-4 text-center text-slate-400 text-sm">
          还没有账号？ <Link href="/register" className="text-purple-400 hover:text-purple-300">立即注册</Link>
        </p>
      </Card>
    </div>
  );
}
