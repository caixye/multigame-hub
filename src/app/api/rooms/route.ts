export const runtime = "edge";

import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
import { createDB } from "@/db";
import { rooms } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const env = (globalThis as any).env || (request as any).env;
  const db = createDB(env.DB);

  const roomList = await db.select().from(rooms).where(eq(rooms.status, "WAITING")).orderBy(desc(rooms.createdAt)).all();

  return Response.json(roomList);
}

export async function POST(request: Request) {
  const token = getTokenFromHeader(request);
  if (!token) return Response.json({ message: "请登录" }, { status: 401 });

  const payload = await verifyJWT(token);
  if (!payload) return Response.json({ message: "Token 无效" }, { status: 401 });

  const { name, gameType, maxPlayers } = await request.json();
  if (!name || !gameType) {
    return Response.json({ message: "缺少参数" }, { status: 400 });
  }

  const env = (globalThis as any).env || (request as any).env;
  const db = createDB(env.DB);

  const roomId = crypto.randomUUID();
  await db.insert(rooms).values({
    id: roomId,
    name,
    gameType,
    maxPlayers: maxPlayers || 8,
    hostId: payload.id,
    status: "WAITING",
    doNamespaceId: roomId,
    createdAt: Date.now(),
  }).run();

  // 初始化 DO 配置
  if (env.GAME_ROOM) {
    const doId = env.GAME_ROOM.idFromName(roomId);
    const doStub = env.GAME_ROOM.get(doId);
    await doStub.fetch(new Request("https://do/config", {
      method: "POST",
      body: JSON.stringify({ gameType, maxPlayers }),
    }));
  }

  return Response.json({ id: roomId }, { status: 201 });
}
