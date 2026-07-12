export const runtime = "edge";

// Next.js 15: params 是 Promise
export async function GET(
  request: Request,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const { route } = await params;
  const roomId = route?.[0] || "default";
  const env = (request as any).env || (globalThis as any).env;

  if (!env?.GAME_ROOM) {
    return new Response("Durable Object binding not found", { status: 500 });
  }

  const doId = env.GAME_ROOM.idFromName(roomId);
  const doStub = env.GAME_ROOM.get(doId);
  return doStub.fetch(request);
}

// 支持 POST（非 WebSocket 的 REST API 调用）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const { route } = await params;
  const roomId = route?.[0] || "default";
  const env = (request as any).env || (globalThis as any).env;

  if (!env?.GAME_ROOM) {
    return new Response("Durable Object binding not found", { status: 500 });
  }

  const doId = env.GAME_ROOM.idFromName(roomId);
  const doStub = env.GAME_ROOM.get(doId);
  return doStub.fetch(request);
}