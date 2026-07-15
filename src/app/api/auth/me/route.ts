import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
import { createDB } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: Request) {
  const token = getTokenFromHeader(request);
  if (!token) {
    return Response.json({ message: "未登录" }, { status: 401 });
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return Response.json({ message: "Token 无效" }, { status: 401 });
  }

  const env = (globalThis as any).env || (request as any).env;
  const db = createDB(env.DB);

  const user = await db.select().from(users).where(eq(users.id, payload.id)).get();
  if (!user) {
    return Response.json({ message: "用户不存在" }, { status: 404 });
  }

  return Response.json({
    id: user.id,
    username: user.username,
    role: user.role,
  });
}