"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, DoorOpen, Bot, LogOut, Gamepad2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/rooms", label: "房间管理", icon: DoorOpen },
  { href: "/admin/ai", label: "AI 配置", icon: Bot },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const getC = (n: string) => { const m = document.cookie.match(new RegExp("(^| )" + n + "=([^;]+)")); return m ? m[2] : ""; };
    const t = getC("token");
    if (!t) { router.push("/login"); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.role !== "ADMIN") router.push("/lobby");
        else setUsername(data.username);
      });
  }, [router]);

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      <aside className="w-56 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-white">管理后台</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Button key={item.href} variant="ghost"
                className={`w-full justify-start gap-2 ${active ? "bg-purple-900/30 text-purple-300" : "text-slate-400 hover:text-white"}`}
                onClick={() => router.push(item.href)}>
                <Icon className="w-4 h-4" />{item.label}
              </Button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2 truncate">{username}</div>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="w-full justify-start text-slate-400 hover:text-red-400">
            <LogOut className="w-4 h-4 mr-1" />退出
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
