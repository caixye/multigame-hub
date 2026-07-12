export const runtime = "edge";


export async function GET(
  request: Request,
  { params }: { params: { route: string[] } }
) {
  const roomId = params.route?.[0] || "default";
  
  // 在 Edge Runtime 中通过 request.cf 或 globalThis 获取 env
  const env = (request as any).env || (globalThis as any).env;
  
  if (!env?.GAME_ROOM) {
    return new Response("Durable Object binding not found", { status: 500 });
  }

  const doId = env.GAME_ROOM.idFromName(roomId);
  const doStub = env.GAME_ROOM.get(doId);

  return doStub.fetch(request);
}

// 如果需要支持 POST（非 WebSocket 的 REST API 调用）
export async function POST(
  request: Request,
  { params }: { params: { route: string[] } }
) {
  const roomId = params.route?.[0] || "default";
  const env = (request as any).env || (globalThis as any).env;
  
  if (!env?.GAME_ROOM) {
    return new Response("Durable Object binding not found", { status: 500 });
  }

  const doId = env.GAME_ROOM.idFromName(roomId);
  const doStub = env.GAME_ROOM.get(doId);

  return doStub.fetch(request);
}