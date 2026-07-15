// ====== GameRoom Durable Object ======
// 核心：处理 WebSocket 连接、游戏状态存储、狼人杀/卧底游戏逻辑

import { generateUndercoverWords, generateNarrative } from "../src/lib/ai";

// ====== 类型定义 ======

interface PlayerState {
  id: string;
  username: string;
  seatNumber: number;
  isReady: boolean;
  isAlive: boolean;
  role: string;         // WEREWOLF | SEER | WITCH | HUNTER | VILLAGER | UNDERCOVER | CIVILIAN | BLANK
  word?: string;        // 卧底游戏词语
  voteTarget?: string;
  ws: WebSocket | null;
  // 女巫专属
  witchHealUsed?: boolean;
  witchPoisonUsed?: boolean;
  // 猎人
  canShoot?: boolean;
}

interface RoomState {
  roomId: string;
  gameType: string;           // WEREWOLF | UNDERCOVER
  status: string;             // WAITING | PLAYING | ENDED
  maxPlayers: number;
  hostId: string;
  players: PlayerState[];

  // 游戏状态
  phase: string;              // NIGHT | DAY | VOTE | DESCRIBE | PK_VOTE | END
  round: number;
  wolfKillTarget?: string;
  witchPosionTarget?: string;
  nightKilled?: string;
  winner?: string;
  pkPlayers?: string[];

  // 卧底专属
  civilianWord?: string;
  undercoverWord?: string;
}

// ====== 狼人杀角色分配 ======
function assignWerewolfRoles(playerCount: number): string[] {
  const wolfCount = Math.max(2, Math.min(4, Math.floor(playerCount / 3)));
  const villagerCount = playerCount - wolfCount - 3;
  const roles: string[] = ["SEER", "WITCH", "HUNTER"];
  for (let i = 0; i < wolfCount; i++) roles.push("WEREWOLF");
  for (let i = 0; i < villagerCount; i++) roles.push("VILLAGER");
  // Fisher-Yates
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

function assignUndercoverRoles(playerCount: number): string[] {
  let uc = 1, blank = 0;
  if (playerCount >= 10) uc = 2;
  else if (playerCount >= 7) blank = 1;
  const roles: string[] = [];
  for (let i = 0; i < uc; i++) roles.push("UNDERCOVER");
  for (let i = 0; i < blank; i++) roles.push("BLANK");
  const civ = playerCount - roles.length;
  for (let i = 0; i < civ; i++) roles.push("CIVILIAN");
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

// ====== GameRoom 类 ======
export class GameRoom extends DurableObject {
  // --- 内部辅助 ---

  /** 广播消息给所有连接的玩家 */
  private broadcast(msg: object, roleFilter?: string) {
    for (const p of this.state.players) {
      if (!p.ws || p.ws.readyState !== WebSocket.READY_STATE_OPEN) continue;
      if (roleFilter && p.role !== roleFilter) continue;
      p.ws.send(JSON.stringify(msg));
    }
  }

  /** 发送给特定玩家 */
  private sendTo(userId: string, msg: object) {
    const p = this.state.players.find((x) => x.id === userId);
    if (p?.ws?.readyState === WebSocket.READY_STATE_OPEN) {
      p.ws.send(JSON.stringify(msg));
    }
  }

  // DO Storage 读写封装
  private state!: RoomState;

  private async loadState(): Promise<RoomState> {
    const raw = await this.ctx.storage.get<RoomState>("roomState");
    if (raw) {
      // 恢复时 ws 引用丢失，设为 null
      for (const p of raw.players) p.ws = null;
      return raw;
    }
    return {
      roomId: "",
      gameType: "WEREWOLF",
      status: "WAITING",
      maxPlayers: 6,
      hostId: "",
      players: [],
      phase: "WAITING",
      round: 0,
    };
  }

  private async saveState() {
    // 存储前移除 ws 引用（不可序列化）
    const toStore = { ...this.state, players: this.state.players.map((p) => ({ ...p, ws: null })) };
    await this.ctx.storage.put("roomState", toStore);
  }

  private getAlivePlayers(): PlayerState[] {
    return this.state.players.filter((p) => p.isAlive);
  }

  private getPlayer(userId: string): PlayerState | undefined {
    return this.state.players.find((p) => p.id === userId);
  }

  // ====== HTTP/WS 入口 ======

  async fetch(request: Request): Promise<Response> {
    this.state = await this.loadState();

    // WebSocket upgrade
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // REST API
    const url = new URL(request.url);

    if (url.pathname.endsWith("/state") && request.method === "GET") {
      return Response.json({
        id: this.state.roomId,
        status: this.state.status,
        gameType: this.state.gameType,
        maxPlayers: this.state.maxPlayers,
        players: this.state.players.map((p) => ({
          id: p.id, username: p.username, seatNumber: p.seatNumber,
          isReady: p.isReady, isAlive: p.isAlive,
        })),
      });
    }

    if (url.pathname.endsWith("/config") && request.method === "POST") {
      const data = await request.json();
      this.state.gameType = data.gameType || this.state.gameType;
      this.state.maxPlayers = data.maxPlayers || this.state.maxPlayers;
      await this.saveState();
      return Response.json({ ok: true });
    }

    if (url.pathname.endsWith("/disband") && request.method === "POST") {
      this.broadcast({ type: "roomDisbanded" });
      await this.ctx.storage.deleteAll();
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }

  // ====== WebSocket 事件 ======

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case "join": return this.handleJoin(ws, msg);
      case "ready": return this.handleReady(msg);
      case "start": return this.handleStart();
      case "action": return this.handleAction(ws, msg);
      case "chat": return this.handleChat(msg);
      case "getState": return this.handleGetState(ws, msg);
      case "pong": return; // heartbeat
    }
  }

  async webSocketClose(ws: WebSocket) {
    const player = this.state.players.find((p) => p.ws === ws);
    if (player) {
      player.ws = null;
      await this.saveState();
      this.broadcast({
        type: "playerLeft",
        player: { id: player.id, username: player.username, seatNumber: player.seatNumber },
      });
    }
  }

  webSocketError(_ws: WebSocket) {
    // webSocketClose 会处理
  }

  // ====== 消息处理器 ======

  private async handleJoin(ws: WebSocket, msg: any) {
    const { userId, username } = msg;

    // 检查是否已在列表中
    let player = this.getPlayer(userId);
    if (player) {
      player.ws = ws;
      player.username = username;
    } else if (this.state.status === "WAITING") {
      const seat = this.state.players.length + 1;
      player = {
        id: userId, username, seatNumber: seat,
        isReady: false, isAlive: true, role: "",
        ws,
      };
      this.state.players.push(player);
    } else {
      // 游戏中重连
      player = this.getPlayer(userId);
      if (!player) {
        ws.send(JSON.stringify({ type: "error", message: "无法加入进行中的游戏" }));
        return;
      }
      player.ws = ws;
    }

    // 首个加入者为房主
    if (this.state.players.length === 1 && !this.state.hostId) {
      this.state.hostId = userId;
    }

    await this.saveState();

    this.broadcast({
      type: "playerJoined",
      player: { id: userId, username, seatNumber: player.seatNumber },
    });
  }

  private async handleReady(msg: any) {
    const p = this.getPlayer(msg.userId || "");
    if (!p) return;
    p.isReady = !p.isReady;
    await this.saveState();
    this.broadcast({ type: "playerReady", userId: p.id, ready: p.isReady });
  }

  private async handleStart() {
    if (this.state.status !== "WAITING") return;
    if (this.state.players.length < 4) return;

    this.state.status = "PLAYING";

    if (this.state.gameType === "WEREWOLF") {
      await this.startWerewolf();
    } else {
      await this.startUndercover();
    }
  }

  // ====== 狼人杀 ======

  private async startWerewolf() {
    const players = this.state.players;
    const roles = assignWerewolfRoles(players.length);

    for (let i = 0; i < players.length; i++) {
      players[i].role = roles[i];
      players[i].isAlive = true;
      if (roles[i] === "WITCH") {
        players[i].witchHealUsed = false;
        players[i].witchPoisonUsed = false;
      }
      if (roles[i] === "HUNTER") players[i].canShoot = false;
    }

    this.state.round = 1;
    this.state.phase = "NIGHT";

    // 通知每个玩家角色
    for (const p of players) {
      this.sendTo(p.id, {
        type: "state",
        roomId: this.state.roomId,
        status: "PLAYING",
        gameType: "WEREWOLF",
        phase: "NIGHT",
        round: 1,
        players: players.map((x) => ({
          id: x.id, username: x.username, seatNumber: x.seatNumber,
          isReady: true, isAlive: true,
        })),
        myRole: p.role,
        actionRequest: { role: p.role, action: p.role === "WEREWOLF" ? "kill" : p.role === "SEER" ? "check" : p.role === "WITCH" ? "witch" : "wait", message: "夜晚阶段，各角色行动" },
      });
    }

    await this.saveState();
  }

  private async werewolfNightAction(msg: any) {
    const { action, target, userId } = msg;
    const player = this.getPlayer(userId);
    if (!player || !player.isAlive) return;

    if (player.role === "WEREWOLF" && action === "kill") {
      this.state.wolfKillTarget = target;
      // 通知其他狼人
      for (const p of this.state.players) {
        if (p.role === "WEREWOLF" && p.isAlive && p.id !== userId) {
          this.sendTo(p.id, {
            type: "chat",
            userId: "system",
            username: "系统",
            content: `[狼群] ${player.seatNumber}号选择击杀 ${target}`,
            timestamp: Date.now().toString(),
            isSystem: true,
            targetRole: "WEREWOLF",
          });
        }
      }
    }

    if (player.role === "SEER" && action === "check") {
      const targetPlayer = this.getPlayer(target);
      if (!targetPlayer) return;
      this.sendTo(userId, {
        type: "chat",
        userId: "system",
        username: "系统",
        content: `查验结果：${targetPlayer.role === "WEREWOLF" ? "狼人" : "好人"}`,
        timestamp: Date.now().toString(),
        isSystem: true,
      });
    }

    if (player.role === "WITCH") {
      if (action === "heal" && !player.witchHealUsed) {
        player.witchHealUsed = true;
      }
      if (action === "poison" && !player.witchPoisonUsed) {
        player.witchPoisonUsed = true;
        this.state.witchPosionTarget = target;
      }
    }

    await this.saveState();
  }

  private async endNight() {
    // 结算夜晚
    let killed: string | null = null;
    const witch = this.state.players.find((p) => p.role === "WITCH" && p.isAlive);

    if (this.state.wolfKillTarget) {
      if (witch && !witch.witchHealUsed) {
        witch.witchHealUsed = true;
      } else {
        killed = this.state.wolfKillTarget;
      }
    }

    if (this.state.witchPosionTarget) {
      killed = this.state.witchPosionTarget;
    }

    // 执行死亡
    if (killed) {
      const victim = this.getPlayer(killed);
      if (victim) victim.isAlive = false;
    }

    // 生成 AI 叙事
    const context = `存活: ${this.getAlivePlayers().length}人, 第${this.state.round}轮`;
    const { narrative } = await generateNarrative("day", context);

    this.state.phase = "DAY";
    this.state.wolfKillTarget = undefined;
    this.state.witchPosionTarget = undefined;

    this.broadcast({
      type: "phase",
      phase: "DAY",
      round: this.state.round,
      narrative,
      data: { killedPlayer: killed },
    });

    // 猎人死亡可开枪
    if (killed) {
      const victim = this.getPlayer(killed);
      if (victim?.role === "HUNTER") {
        victim.canShoot = true;
        this.sendTo(killed, { type: "actionRequest", role: "HUNTER", action: "shoot", message: "猎人请开枪" });
      }
    }

    // 检查游戏结束
    await this.checkWerewolfEnd();
    if (this.state.phase === "END") return;

    await this.saveState();
  }

  private async resolveVote() {
    const alive = this.getAlivePlayers();
    const voteCount = new Map<string, number>();

    for (const p of alive) {
      if (p.voteTarget) {
        voteCount.set(p.voteTarget, (voteCount.get(p.voteTarget) || 0) + 1);
      }
    }

    let maxVotes = 0, maxPlayer: string | null = null, tie = false;
    for (const [id, count] of voteCount) {
      if (count > maxVotes) { maxVotes = count; maxPlayer = id; tie = false; }
      else if (count === maxVotes) { tie = true; }
    }

    if (maxPlayer && !tie) {
      const victim = this.getPlayer(maxPlayer);
      if (victim) {
        victim.isAlive = false;
        this.broadcast({ type: "chat", userId: "system", username: "系统", content: `[系统] ${victim.seatNumber}号被放逐`, timestamp: Date.now().toString(), isSystem: true });

        if (victim.role === "HUNTER") {
          victim.canShoot = true;
          this.sendTo(victim.id, { type: "actionRequest", role: "HUNTER", action: "shoot", message: "猎人请开枪" });
        }
      }
    } else {
      this.broadcast({ type: "chat", userId: "system", username: "系统", content: "[系统] 投票平局，无人被放逐", timestamp: Date.now().toString(), isSystem: true });
    }

    // 清空投票
    for (const p of alive) p.voteTarget = undefined;

    await this.checkWerewolfEnd();
    if (this.state.phase === "END") return;

    // 进入下一轮夜晚
    this.state.round++;
    this.state.phase = "NIGHT";

    const { narrative } = await generateNarrative("night", `存活: ${this.getAlivePlayers().length}人`);
    this.broadcast({ type: "phase", phase: "NIGHT", round: this.state.round, narrative });

    await this.saveState();
  }

  private async checkWerewolfEnd() {
    const aliveWolves = this.getAlivePlayers().filter((p) => p.role === "WEREWOLF");
    const aliveGood = this.getAlivePlayers().filter((p) => p.role !== "WEREWOLF");

    if (aliveWolves.length === 0) {
      this.state.phase = "END";
      this.state.winner = "VILLAGER";
      this.state.status = "ENDED";
      this.broadcast({ type: "gameEnd", winner: "VILLAGER", players: this.state.players.map((p) => ({ id: p.id, username: p.username, seatNumber: p.seatNumber, role: p.role, isAlive: p.isAlive })) });
    } else if (aliveWolves.length >= aliveGood.length) {
      this.state.phase = "END";
      this.state.winner = "WEREWOLF";
      this.state.status = "ENDED";
      this.broadcast({ type: "gameEnd", winner: "WEREWOLF", players: this.state.players.map((p) => ({ id: p.id, username: p.username, seatNumber: p.seatNumber, role: p.role, isAlive: p.isAlive })) });
    }

    await this.saveState();
  }

  // ====== 卧底 ======

  private async startUndercover() {
    const { civilianWord, undercoverWord } = await generateUndercoverWords();
    this.state.civilianWord = civilianWord;
    this.state.undercoverWord = undercoverWord;

    const players = this.state.players;
    const roles = assignUndercoverRoles(players.length);

    for (let i = 0; i < players.length; i++) {
      players[i].role = roles[i];
      players[i].isAlive = true;
      if (roles[i] === "CIVILIAN") players[i].word = civilianWord;
      else if (roles[i] === "UNDERCOVER") players[i].word = undercoverWord;
      else players[i].word = ""; // BLANK
    }

    this.state.round = 1;
    this.state.phase = "DESCRIBE";

    for (const p of players) {
      this.sendTo(p.id, {
        type: "state",
        roomId: this.state.roomId,
        status: "PLAYING",
        gameType: "UNDERCOVER",
        phase: "DESCRIBE",
        round: 1,
        players: players.map((x) => ({
          id: x.id, username: x.username, seatNumber: x.seatNumber,
          isReady: true, isAlive: true,
        })),
        myRole: p.role,
        myWord: p.word,
      });
    }

    await this.saveState();
  }

  private async undercoverVote() {
    const alive = this.getAlivePlayers();
    const voteCount = new Map<string, number>();

    for (const p of alive) {
      if (p.voteTarget) {
        voteCount.set(p.voteTarget, (voteCount.get(p.voteTarget) || 0) + 1);
      }
    }

    let maxVotes = 0, maxPlayers: string[] = [];
    for (const [id, count] of voteCount) {
      if (count > maxVotes) { maxVotes = count; maxPlayers = [id]; }
      else if (count === maxVotes) { maxPlayers.push(id); }
    }

    if (maxPlayers.length === 1) {
      const victim = this.getPlayer(maxPlayers[0]);
      if (victim) victim.isAlive = false;
      this.broadcast({ type: "chat", userId: "system", username: "系统", content: `[系统] ${victim?.seatNumber}号被投票出局`, timestamp: Date.now().toString(), isSystem: true });
    } else {
      // 平票进入 PK
      this.state.pkPlayers = maxPlayers;
      this.broadcast({ type: "phase", phase: "PK_VOTE", round: this.state.round, data: { pkPlayers: maxPlayers } });
    }

    // 检查结束
    const aliveUC = this.getAlivePlayers().filter((p) => p.role === "UNDERCOVER");
    const aliveCiv = this.getAlivePlayers().filter((p) => p.role !== "UNDERCOVER");

    if (aliveUC.length === 0) {
      this.state.phase = "END";
      this.state.winner = "CIVILIAN";
      this.state.status = "ENDED";
      this.broadcast({ type: "gameEnd", winner: "CIVILIAN", players: this.state.players.map((p) => ({ id: p.id, username: p.username, seatNumber: p.seatNumber, role: p.role, isAlive: p.isAlive })) });
    } else if (aliveUC.length >= aliveCiv.length) {
      this.state.phase = "END";
      this.state.winner = "UNDERCOVER";
      this.state.status = "ENDED";
      this.broadcast({ type: "gameEnd", winner: "UNDERCOVER", players: this.state.players.map((p) => ({ id: p.id, username: p.username, seatNumber: p.seatNumber, role: p.role, isAlive: p.isAlive })) });
    }

    // 清空投票
    for (const p of alive) p.voteTarget = undefined;
    await this.saveState();
  }

  // ====== 动作分发 ======

  private async handleAction(ws: WebSocket, msg: any) {
    const { action, target, userId } = msg;
    const player = this.getPlayer(userId);
    if (!player || !player.isAlive) return;

    if (this.state.gameType === "WEREWOLF") {
      if (action === "endNight") return this.endNight();
      if (action === "vote") {
        player.voteTarget = target;
        this.broadcast({ type: "voteUpdate", voterId: userId, targetId: target });
        // 全部存活投完 → 结算
        if (this.getAlivePlayers().every((p) => p.voteTarget)) {
          return this.resolveVote();
        }
      }
      if (action === "shoot") {
        const targetPlayer = this.getPlayer(target);
        if (targetPlayer && player.role === "HUNTER" && player.canShoot) {
          targetPlayer.isAlive = false;
          player.canShoot = false;
          this.broadcast({ type: "chat", userId: "system", username: "系统", content: `[系统] 猎人开枪带走了${targetPlayer.seatNumber}号`, timestamp: Date.now().toString(), isSystem: true });
          await this.checkWerewolfEnd();
        }
      }
      if (action === "kill" || action === "check" || action === "heal" || action === "poison") {
        return this.werewolfNightAction(msg);
      }
    }

    if (this.state.gameType === "UNDERCOVER") {
      if (action === "describe") {
        this.broadcast({ type: "chat", userId, username: player.username, content: `[描述] ${msg.data || ""}`, timestamp: Date.now().toString(), isSystem: false });
      }
      if (action === "vote") {
        player.voteTarget = target;
        this.broadcast({ type: "voteUpdate", voterId: userId, targetId: target });
        if (this.getAlivePlayers().every((p) => p.voteTarget)) {
          return this.undercoverVote();
        }
      }
    }

    await this.saveState();
  }

  // ====== 聊天 ======

  private async handleChat(msg: any) {
    const { userId, username, content } = msg;
    const player = this.getPlayer(userId);
    if (!player) return;

    // 游戏中死亡玩家不可公聊（简化：直接广播，前端过滤）
    this.broadcast({
      type: "chat",
      userId,
      username,
      content,
      timestamp: Date.now().toString(),
    });
  }

  // ====== 断线重连 ======

  private async handleGetState(ws: WebSocket, msg: any) {
    const player = this.getPlayer(msg.userId);
    if (player) {
      player.ws = ws;
      await this.saveState();
    }

    const stateMsg: any = {
      type: "state",
      roomId: this.state.roomId,
      status: this.state.status,
      gameType: this.state.gameType,
      phase: this.state.phase,
      round: this.state.round,
      players: this.state.players.map((p) => ({
        id: p.id, username: p.username, seatNumber: p.seatNumber,
        isReady: p.isReady, isAlive: p.isAlive,
      })),
    };

    if (player) {
      stateMsg.myRole = player.role;
      stateMsg.myWord = player.word;
    }

    ws.send(JSON.stringify(stateMsg));
  }
}

export default {
  fetch() {
    return new Response("GameRoom Durable Object Worker", { status: 404 });
  },
};
