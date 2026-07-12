export const runtime = "edge";

import { verifyJWT, getTokenFromHeader } from "@/lib/auth";

export async function POST(request: Request) {
  const token = getTokenFromHeader(request);
  if (!token) return Response.json({ error: "未登录" }, { status: 401 });
  const payload = await verifyJWT(token);
  if (!payload || payload.role !== "ADMIN") return Response.json({ error: "未授权" }, { status: 403 });

  const config = await request.json();
  const startTime = Date.now();

  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.modelName,
        messages: [{ role: "user", content: "Say hello in one short sentence." }],
        max_tokens: 50,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return Response.json({ success: true, content, duration: Date.now() - startTime });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message });
  }
}
