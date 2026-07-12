"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ====== 消息协议类型 ======

/** 客户端 → 服务端 消息 */
export type ClientMessage =
  | { type: "join"; userId: string; username: string; token: string }
  | { type: "ready" }
  | { type: "start" }
  | { type: "action"; action: string; target?: string; data?: any }
  | { type: "chat"; content: string }
  | { type: "getState" }
  | { type: "pong" };

/** 服务端 → 客户端 消息 */
export type ServerMessage = {
  type: "state"; // 完整状态同步
  roomId: string;
  status: string;
  gameType: string;
  phase: string;
  round: number;
  players: PlayerInfo[];
  myRole?: string;
  myWord?: string;
  narrative?: string;
  actionRequest?: { role: string; action: string; message: string };
  witchState?: { healUsed: boolean; poisonUsed: boolean };
  voteResults?: Record<string, string>;
  pkPlayers?: string[];
  winner?: string;
  gameEndPlayers?: any[];
} | {
  type: "playerJoined" | "playerLeft";
  player: { id: string; username: string; seatNumber: number };
} | {
  type: "playerReady";
  userId: string;
  ready: boolean;
} | {
  type: "phase";
  phase: string;
  round: number;
  narrative?: string;
  data?: any;
} | {
  type: "narrative";
  text: string;
} | {
  type: "actionRequest";
  role: string;
  action: string;
  message: string;
  data?: any;
} | {
  type: "chat";
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
  targetRole?: string; // 私聊目标角色
} | {
  type: "voteUpdate";
  voterId: string;
  targetId: string;
} | {
  type: "gameEnd";
  winner: string;
  players: any[];
} | {
  type: "error";
  message: string;
} | {
  type: "pong";
};

export interface PlayerInfo {
  id: string;
  username: string;
  seatNumber: number;
  isReady: boolean;
  isAlive: boolean;
}

export type ConnectionStatus = "connecting" | "open" | "closed" | "reconnecting";

interface UseGameWebSocketOptions {
  roomId: string;
  userId: string;
  username: string;
  token: string;
  onMessage: (msg: ServerMessage) => void;
}

/**
 * WebSocket 客户端 Hook
 * - 自动连接 DO 的 WebSocket 端点
 * - 心跳检测 (ping/pong)
 * - 自动重连 (exponential backoff)
 */
export function useGameWebSocket({
  roomId,
  userId,
  username,
  token,
  onMessage,
}: UseGameWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/api/ws/${roomId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("open");
      reconnectAttempts.current = 0;

      // 发送 join 消息
      ws.send(JSON.stringify({ type: "join", userId, username, token }));

      // 心跳检测（每 25 秒 ping）
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === "pong") return;
        onMessageRef.current(msg);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (!mountedRef.current) return;
      setStatus("closed");

      // 自动重连
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      setStatus("reconnecting");

      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose 会紧跟触发，不额外处理
    };
  }, [roomId, userId, username, token]);

  // 挂载时连接
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  /** 发送消息 */
  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { status, send };
}
