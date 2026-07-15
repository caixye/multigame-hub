import { signJWT, comparePassword } from "@/lib/auth";
import { createDB } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return Response.json({ message: "请输入用户名和密码" }, { status: 400 });
    }

    const env = (globalThis as any).env || (request as any).env;
    const db = createDB(env.DB);

    const user = await db.select().from(users).where(eq(users.username, username)).get();
    if (!user) {
      return Response.json({ message: "用户名或密码错误" }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return Response.json({ message: "用户名或密码错误" }, { status: 401 });
    }

    const token = await signJWT({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return Response.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (e: any) {
    return Response.json({ message: "服务器错误" }, { status: 500 });
  }
}