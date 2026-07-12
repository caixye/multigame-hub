export const runtime = "edge";

import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
import { createDB } from "@/db";
import { aiConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const token = getTokenFromHeader(request);
  if (!token) return Response.json({ error: "未登录" }, { status: 401 });
  const payload = await verifyJWT(token);
  if (!payload || payload.role !== "ADMIN") return Response.json({ error: "未授权" }, { status: 403 });

  const env = (globalThis as any).env || (request as any).env;
  const db = createDB(env.DB);
  const config = await db.select().from(aiConfigs).where(eq(aiConfigs.isActive, 1)).get();

  return Response.json({ config });
}

export async function POST(request: Request) {
  const token = getTokenFromHeader(request);
  if (!token) return Response.json({ error: "未登录" }, { status: 401 });
  const payload = await verifyJWT(token);
  if (!payload || payload.role !== "ADMIN") return Response.json({ error: "未授权" }, { status: 403 });

  const env = (globalThis as any).env || (request as any).env;
  const db = createDB(env.DB);
  const data = await request.json();

  // 设为活跃前取消其他
  if (data.isActive) {
    await db.update(aiConfigs).set({ isActive: 0 }).where(eq(aiConfigs.isActive, 1)).run();
  }

  if (data.id) {
    await db.update(aiConfigs).set({
      baseURL: data.baseURL, apiKey: data.apiKey,
      modelName: data.modelName, temperature: Math.round(data.temperature * 100),
      maxTokens: data.maxTokens, isActive: data.isActive ? 1 : 0,
      updatedAt: Date.now(),
    }).where(eq(aiConfigs.id, data.id)).run();
  } else {
    await db.insert(aiConfigs).values({
      id: crypto.randomUUID(),
      baseURL: data.baseURL, apiKey: data.apiKey,
      modelName: data.modelName, temperature: Math.round(data.temperature * 100),
      maxTokens: data.maxTokens, isActive: data.isActive ? 1 : 0,
      updatedAt: Date.now(),
    }).run();
  }

  return Response.json({ ok: true });
}
