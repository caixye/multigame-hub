"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Users, LogOut, Plus, Gamepad2, Moon, Search } from "lucide-react";

interface RoomInfo {
  id: string;
  name: string;
  gameType: string;
  status: string;
  maxPlayers: number;
  hostId: string;
  createdAt: number;
}

interface UserInfo {
  id: string;
  username: string;
  role: string;
}

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [token, setToken] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [newRoom, setNewRoom] = useState({ name: "", gameType: "WEREWOLF", maxPlayers: 6 });
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "WEREWOLF" | "UNDERCOVER">("ALL");

  // 从 Cookie 读取 token
  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? match[2] : "";
    };
    const t = getCookie("token");
    if (!t) { router.push("/login"); return; }
    setToken(t);

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.username) setUser(data);
        else router.push("/login");
      });
  }, [router]);

  // 获取房间列表
  useEffect(() => {
    if (!token) return;
    const fetchRooms = () => {
      fetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then(setRooms)
        .catch(() => {});
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    router.push("/login");
  };

  const handleCreate = async () => {
    if (!newRoom.name.trim()) { setError("请输入房间名称"); return; }
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(newRoom),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/room/${data.id}`);
    } else {
      setError("创建失败");
    }
  };

  const handleJoin = () => {
    if (joinRoomId.trim()) router.push(`/room/${joinRoomId}`);
  };

  const filteredRooms = filter === "ALL" ? rooms : rooms.filter((r) => r.gameType === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-white text-lg">MultiGame Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">
              <Users className="w-4 h-4 inline mr-1" />{user?.username}
            </span>
            {user?.role === "ADMIN" && (
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}
                className="text-slate-400 hover:text-white">管理后台</Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}
              className="text-slate-400 hover:text-red-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1" /> 创建房间
          </Button>
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
            <Input value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="输入房间ID加入"
              className="border-0 bg-transparent w-48 text-sm text-white placeholder:text-slate-500" />
            <Button size="sm" onClick={handleJoin} className="bg-blue-600 hover:bg-blue-700">加入</Button>
          </div>
          <div className="flex gap-1 ml-auto">
            {(["ALL","WEREWOLF","UNDERCOVER"] as const).map((f) => (
              <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm"
                onClick={() => setFilter(f)} className={filter === f ? "bg-purple-600" : "text-slate-400"}>
                {f === "ALL" ? "全部" : f === "WEREWOLF" ? "狼人杀" : "卧底"}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
            {error}
            <button className="ml-2 text-red-400" onClick={() => setError("")}>✕</button>
          </div>
        )}

        {showCreate && (
          <Card className="mb-6 p-4 bg-slate-900/80 border-slate-700/50">
            <h3 className="text-white font-bold mb-3">创建房间</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm text-slate-400 mb-1">房间名称</label>
                <Input value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white w-48" placeholder="给房间起个名字" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">游戏类型</label>
                <div className="flex gap-1">
                  <Button variant={newRoom.gameType === "WEREWOLF" ? "default" : "outline"} size="sm"
                    onClick={() => setNewRoom({ ...newRoom, gameType: "WEREWOLF", maxPlayers: 6 })}
                    className={newRoom.gameType === "WEREWOLF" ? "bg-purple-600" : "border-slate-600 text-slate-400"}>
                    <Moon className="w-3 h-3 mr-1" /> 狼人杀
                  </Button>
                  <Button variant={newRoom.gameType === "UNDERCOVER" ? "default" : "outline"} size="sm"
                    onClick={() => setNewRoom({ ...newRoom, gameType: "UNDERCOVER", maxPlayers: 4 })}
                    className={newRoom.gameType === "UNDERCOVER" ? "bg-purple-600" : "border-slate-600 text-slate-400"}>
                    <Search className="w-3 h-3 mr-1" /> 卧底
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">人数 ({newRoom.maxPlayers})</label>
                <input type="range" min={newRoom.gameType === "WEREWOLF" ? 6 : 4}
                  max={newRoom.gameType === "WEREWOLF" ? 12 : 10}
                  value={newRoom.maxPlayers}
                  onChange={(e) => setNewRoom({ ...newRoom, maxPlayers: parseInt(e.target.value) })}
                  className="w-32 accent-purple-600" />
              </div>
              <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">创建</Button>
            </div>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <Card key={room.id} onClick={() => router.push(`/room/${room.id}`)}
              className="p-4 cursor-pointer bg-slate-900/80 hover:bg-slate-800/80 hover:border-purple-500/50 border-slate-700/50 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {room.gameType === "WEREWOLF" ? <Moon className="w-5 h-5 text-purple-400" /> : <Search className="w-5 h-5 text-purple-400" />}
                  <h3 className="text-white font-semibold truncate">{room.name}</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-400">等待中</span>
              </div>
              <div className="text-sm text-slate-400">
                {room.gameType === "WEREWOLF" ? "狼人杀" : "谁是卧底"}
                <span className="ml-2 text-slate-500">{room.maxPlayers}人</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">ID: {room.id.slice(0, 8)}</div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
