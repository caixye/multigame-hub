import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production-multigame"
);

export const config = {
  matcher: ["/lobby/:path*", "/room/:path*", "/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 从 Cookie 或 Authorization header 获取 token
  const token = request.cookies.get("token")?.value ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    if (pathname.startsWith("/lobby") || pathname.startsWith("/room")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // 管理员路由保护
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/lobby", request.url));
    }

    // 添加用户信息到请求头
    const response = NextResponse.next();
    response.headers.set("X-User-Id", payload.id as string);
    response.headers.set("X-User-Role", role);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
