export const runtime = "edge";
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useGameWebSocket, ServerMessage, PlayerInfo, ConnectionStatus } from "@/lib/websocket";
import { NarrativePanel } from "@/components/game/NarrativePanel";
import { VotePanel } from "@/components/game/VotePanel";
import { ChatBox } from "@/components/game/ChatBox";
import { PlayerList } from "@/components/game/PlayerList";
import { RoleCard } from "@/components/game/RoleCard";
import { Countdown } from "@/components/game/Countdown";
import { ArrowLeft, Users, MessageSquare, Gavel, Moon } from "lucide-react";

interface ChatMsg {
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

const ROLE_INFO: Record<string, { name: string; desc: string }> = {
  WEREWOLF: { name: "狼人", desc: "每晚可击杀一名玩家" },
  SEER: { name: "预言家", desc: "每晚查验一名玩家身份" },
  WITCH: { name: "女巫", desc: "一瓶解药和一瓶毒药" },
  HUNTER: { name: "猎人", desc: "死亡时可开枪带走一人" },
  VILLAGER: { name: "村民", desc: "通过推理找出狼人" },
  UNDERCOVER: { name: "卧底", desc: "隐藏身份，存活到最后" },
  CIVILIAN: { name: "平民", desc: "描述词语，找出卧底" },
  BLANK: { name: "白板", desc: "没有词语，靠观察推断" },
};

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  // 用户信息（从 Cookie 读取）
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");

  // 房间状态
  const [roomState, setRoomState] = useState<{
    status: string; gameType: string; phase: string; round: number; players: PlayerInfo[];
    myRole?: string; myWord?: string;
  } | null>(null);
  const [showRoleCard, setShowRoleCard] = useState(false);

  // 游戏状态
  const [narrative, setNarrative] = useState("");
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState("");
  const [voteTargetId, setVoteTargetId] = useState("");
  const [isDead, setIsDead] = useState(false);

  // 聊天
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "players">("chat");

  // 初始化
  useEffect(() => {
    const getC = (n: string) => { const m = document.cookie.match(new RegExp("(^| )" + n + "=([^;]+)")); return m ? m[2] : ""; };
    const t = getC("token");
    if (!t) { router.push("/login"); return; }
    setToken(t);

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.username) { setUserId(data.id); setUsername(data.username); }
        else router.push("/login");
      });
  }, [router]);

  // WebSocket handler
  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "state":
        setRoomState({
          status: msg.status, gameType: msg.gameType, phase: msg.phase,
          round: msg.round, players: msg.players,
          myRole: msg.myRole, myWord: msg.myWord,
        });
        if (msg.myRole) setShowRoleCard(true);
        break;
      case "playerJoined":
        addSystemMsg(`${msg.player.username} 加入了房间`);
        break;
      case "playerLeft":
        addSystemMsg(`${msg.player.username} 离开了房间`);
        break;
      case "playerReady":
        addSystemMsg(`玩家 ${msg.userId} ${msg.ready ? "已准备" : "取消准备"}`);
        break;
      case "phase":
        setNarrative(msg.narrative || "");
        if (roomState) setRoomState({ ...roomState, phase: msg.phase, round: msg.round });
        break;
      case "narrative":
        setNarrative(msg.text);
        break;
      case "chat":
        setMessages((prev) => [...prev, msg as ChatMsg]);
        break;
      case "voteUpdate":
        break;
      case "gameEnd":
        setGameEnded(true);
        setWinner(msg.winner);
        break;
      case "error":
        addSystemMsg(`[错误] ${msg.message}`);
        break;
    }
  }, [roomState]);

  const { status: wsStatus, send } = useGameWebSocket({
    roomId, userId, username, token,
    onMessage,
  });

  const addSystemMsg = (content: string) => {
    setMessages((prev) => [...prev, {
      userId: "system", username: "系统",
      content: `[系统] ${content}`,
      timestamp: Date.now().toString(),
    }]);
  };

  const handleReady = () => send({ type: "ready" });
  const handleStart = () => send({ type: "start" });
  const handleLeave = () => router.push("/lobby");
  const handleChat = (content: string) => send({ type: "chat", content });
  const handleVote = (targetId: string) => {
    setVoteTargetId(targetId);
    send({ type: "action", action: "vote", target: targetId });
  };
  const handleAction = (action: string, target?: string) => {
    send({ type: "action", action, target });
  };

  const isWerewolf = roomState?.gameType === "WEREWOLF";
  const isHost = roomState?.players[0]?.id === userId;
  const myPlayer = roomState?.players.find((p) => p.id === userId);
  const isReady = myPlayer?.isReady || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* 角色卡 */}
      {showRoleCard && roomState?.myRole && (
        <RoleCard
          role={roomState.myRole}
          roleName={ROLE_INFO[roomState.myRole]?.name || roomState.myRole}
          description={`${ROLE_INFO[roomState.myRole]?.desc || ""}\n${roomState.myWord ? `词语：${roomState.myWord}` : ""}`}
          overlay
          onClose={() => setShowRoleCard(false)}
        />
      )}

      <header className="border-b border-slate-700/50 bg-slate-950/50 backdrop-blur-sm">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLeave} className="text-slate-400">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-white font-semibold">房间 {roomId.slice(0, 8)}</h1>
            <span className="text-sm text-green-400">{wsStatus}</span>
            {roomState?.phase && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {roomState.phase}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Desktop: 3-column */}
        <aside className="hidden md:block w-52 border-r border-slate-700/50 p-3 overflow-y-auto bg-slate-950/30">
          <PlayerList players={(roomState?.players || []).map((p) => ({
            id: p.id, username: p.username, seatNumber: p.seatNumber,
            isReady: p.isReady, isAlive: p.isAlive,
            isHost: p.id === roomState?.players[0]?.id,
            isCurrentUser: p.id === userId,
          }))} showReady={roomState?.status === "WAITING"} showAlive={roomState?.status === "PLAYING"} />
        </aside>

        <main className="flex-1 p-4 overflow-y-auto">
          {/* 等待阶段 */}
          {roomState?.status === "WAITING" && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <p className="text-slate-400">等待玩家加入...</p>
              <div className="flex gap-3">
                <Button onClick={handleReady} className={isReady ? "bg-green-600" : "bg-purple-600"}>
                  {isReady ? "已准备 ✓" : "准备"}
                </Button>
                {isHost && (
                  <Button onClick={handleStart} className="bg-green-600">开始游戏</Button>
                )}
              </div>
            </div>
          )}

          {/* 叙事面板 */}
          {narrative && <NarrativePanel text={narrative} type={isWerewolf ? "werewolf" : "undercover"} />}

          {/* 投票/操作 */}
          {roomState?.phase === "VOTE" && !isDead && (
            <div className="mt-4">
              <Countdown seconds={60} />
              <VotePanel
                players={(roomState?.players || []).filter((p) => p.isAlive && p.id !== userId)
                  .map((p) => ({ userId: p.id, seatNumber: p.seatNumber, username: p.username, isAlive: p.isAlive }))}
                onVote={handleVote}
                votedTarget={voteTargetId}
              />
            </div>
          )}

          {/* 游戏结束 */}
          {gameEnded && (
            <div className="text-center mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">游戏结束</h2>
              <p className="text-lg text-yellow-400">
                {winner === "WEREWOLF" ? "🐺 狼人胜利！" :
                 winner === "VILLAGER" ? "😇 村民胜利！" :
                 winner === "UNDERCOVER" ? "🕵️ 卧底胜利！" :
                 winner === "CIVILIAN" ? "😇 平民胜利！" : "比赛结束"}
              </p>
              <Button onClick={handleLeave} className="mt-6 bg-purple-600">返回大厅</Button>
            </div>
          )}
        </main>

        <aside className="hidden md:block w-72 border-l border-slate-700/50 bg-slate-950/30">
          <ChatBox messages={messages} onSend={handleChat} currentUserId={userId}
            quickMessages={isWerewolf ? ["我是好人","投他","过"] : ["过","提示一下","投他"]} />
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden flex flex-col w-full">
          <div className="flex border-b border-slate-700/50 bg-slate-950/30">
            <button onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 text-xs font-medium ${activeTab === "chat" ? "text-purple-400 border-b-2 border-purple-500" : "text-slate-500"}`}>
              <MessageSquare className="w-3 h-3 inline mr-1" /> 聊天
            </button>
            <button onClick={() => setActiveTab("players")}
              className={`flex-1 py-2 text-xs font-medium ${activeTab === "players" ? "text-purple-400 border-b-2 border-purple-500" : "text-slate-500"}`}>
              <Users className="w-3 h-3 inline mr-1" /> 玩家
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === "players" ? (
              <div>
                <PlayerList players={(roomState?.players || []).map((p) => ({
                  id: p.id, username: p.username, seatNumber: p.seatNumber,
                  isReady: p.isReady, isAlive: p.isAlive,
                  isCurrentUser: p.id === userId,
                }))} compact />
                {roomState?.status === "WAITING" && (
                  <div className="mt-4 flex gap-2 justify-center">
                    <Button onClick={handleReady} size="sm" className={isReady ? "bg-green-600" : "bg-purple-600"}>
                      {isReady ? "已准备" : "准备"}
                    </Button>
                    {isHost && <Button onClick={handleStart} size="sm" className="bg-green-600">开始</Button>}
                  </div>
                )}
              </div>
            ) : (
              <ChatBox messages={messages} onSend={handleChat} currentUserId={userId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
