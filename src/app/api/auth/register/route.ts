import { signJWT, hashPassword } from "@/lib/auth";
import { createDB } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password || username.length < 3 || password.length < 6) {
      return Response.json({ message: "用户名至少3字符，密码至少6字符" }, { status: 400 });
    }

    const env = (globalThis as any).env || (request as any).env;
    const db = createDB(env.DB);

    const existing = await db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return Response.json({ message: "用户名已存在" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    await db.insert(users).values({
      id: crypto.randomUUID(),
      username,
      password: hashed,
      role: "USER",
      createdAt: Date.now(),
    }).run();

    return Response.json({ message: "注册成功" }, { status: 201 });
  } catch (e: any) {
    return Response.json({ message: "服务器错误" }, { status: 500 });
  }
}