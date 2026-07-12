# 重构任务：将 MultiGame Hub 部署至 Cloudflare Pages (Edge Runtime)

## 背景
现有代码基于 Next.js 14 + Socket.IO + Prisma + SQLite + Node.js Runtime，需要完整重构以适配 Cloudflare Pages Edge Runtime。

## 核心技术栈变更
| 原技术 | 新技术 | 原因 |
|--------|--------|------|
| Next.js 14 (Node runtime) | Next.js 14 + `@cloudflare/next-on-pages` | 适配 Pages Edge Runtime |
| Socket.IO | Cloudflare Durable Objects + 原生 WebSocket | Socket.IO 依赖 Node.js net/http |
| Prisma + SQLite | Drizzle ORM + Cloudflare D1 | Edge 兼容，D1 是 Pages 原生 Serverless DB |
| NextAuth.js | 自定义 JWT (jose 库) + D1 用户表 | NextAuth 依赖 Node.js crypto/adapter |
| 内存状态 | Durable Object Storage | Edge 无状态，必须用 DO 存储房间状态 |

## 详细重构要求

### 1. 项目配置与构建
- 安装 `@cloudflare/next-on-pages` 作为 dev dependency
- 创建 `wrangler.toml`：
  - 绑定 D1 数据库（database_name, database_id）
  - 绑定 Durable Object namespace `GameRoom`（class_name = GameRoom, script_name）
  - 定义兼容性日期 `compatibility_date = "2026-07-12"`
- 修改 `package.json` scripts：
  - `build`: `next-on-pages`
  - `dev`: `next dev` (本地开发) + `wrangler pages dev` (带绑定测试)
  - `deploy`: `wrangler pages deploy`
- 所有 API Route 和 Middleware 必须声明 `export const runtime = 'edge'`

### 2. 数据库层 (D1 + Drizzle)
- 移除 Prisma，安装 `drizzle-orm` 和 `drizzle-kit`
- 创建 `src/db/schema.ts` 定义所有表（使用 SQLite 语法，D1 兼容）：
  - `users`: id, username, password(bcryptjs hash), role, createdAt
  - `rooms`: id, name, gameType, status, maxPlayers, hostId, doNamespaceId(用于关联 DO), createdAt
  - `gameHistory`: id, roomId, winner, rounds, endedAt
- 创建 `src/db/index.ts`：导出 D1 client（`drizzle(d1DatabaseBinding)`）
- 创建 `drizzle.config.ts`：配置 D1 迁移
- 在 `wrangler.toml` 中配置 D1 绑定 `DB = { binding = "DB", database_name = "multigame", ... }`
- 提供迁移命令脚本

### 3. 认证系统 (Edge 兼容)
- 移除 NextAuth，使用 `jose` 库处理 JWT
- `src/lib/auth.ts`：
  - `signJWT(payload)`：使用 `new SignJWT()` + `TextEncoder` 签名
  - `verifyJWT(token)`：验证并返回 payload
  - 密钥从环境变量 `JWT_SECRET` 获取
  - `hashPassword` / `comparePassword`：使用 `bcryptjs`（纯 JS，Edge 兼容）
- API Routes:
  - `POST /api/auth/register`：D1 插入用户，bcryptjs 哈希密码
  - `POST /api/auth/login`：验证密码，签发 JWT（httpOnly cookie 或 Authorization Header）
  - `GET /api/auth/me`：验证 JWT 返回当前用户
- Middleware (`src/middleware.ts`)：
  - 检查 `/admin/*` 路径，验证 JWT，确认 role === 'ADMIN'
  - 使用 `NextResponse` 进行重定向/拦截

### 4. 实时通信架构 (Durable Objects + WebSocket)
这是核心重构，必须完全替换 Socket.IO。

#### 4.1 Durable Object 定义 (`src/do/GameRoom.ts`)
创建 `GameRoom` 类，继承 `DurableObject`：
- **状态存储**：使用 `this.ctx.storage` (DO 持久化存储) 保存：
  - `roomState`: 房间元数据（游戏类型、设置、当前阶段）
  - `players`: Map&lt;userId, {username, role, isAlive, ws}&gt;
  - `gameData`: 狼人杀/卧底的具体游戏状态（回合、投票、角色分配）
  - `aiConfig`: 当前使用的 AI 配置缓存
- **WebSocket 处理**：
  - `fetch(request)`：处理 HTTP 请求
    - 如果请求头包含 `Upgrade: websocket`，调用 `this.ctx.acceptWebSocket(request)` 接受连接
    - 否则处理 REST API（获取房间状态、创建房间配置）
  - `webSocketMessage(ws, message)`：解析 JSON 消息，按 type 分发：
    - `join`: 玩家加入，广播玩家列表更新
    - `ready`: 玩家准备，检查是否全部准备
    - `start`: 房主开始游戏，初始化游戏状态，分配角色
    - `action`: 游戏动作（狼人杀人、预言家查验、投票、描述词语等）
    - `chat`: 公共聊天/夜间私聊（服务端根据角色和阶段过滤接收者）
    - `getState`: 请求当前完整状态（用于断线重连）
  - `webSocketClose(ws, code, reason, wasClean)`：标记玩家离线，广播更新
  - `webSocketError(ws, error)`：错误处理
- **HTTP API (fetch 非 WebSocket)**：
  - `GET /state`：返回当前房间公开状态（JSON）
  - `POST /config`：更新房间配置（仅房主）
- **游戏逻辑内嵌**：
  - 将原 `server/socket/handlers/werewolf.ts` 和 `undercover.ts` 的逻辑迁移到 DO 类的方法中
  - 所有状态变更通过 `this.ctx.storage.put('key', value)` 持久化
  - 广播消息通过遍历所有连接的 WebSocket 发送

#### 4.2 WebSocket 连接路由 (`src/app/api/ws/[[...route]]/route.ts`)
- Edge API Route，接收 WebSocket 升级请求
- 从 URL 参数获取 `roomId`
- 通过 `env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId))` 获取 DO 实例
- 将请求直接 `fetch` 到 DO 实例（DO 的 fetch 会处理 WebSocket upgrade）

#### 4.3 客户端 WebSocket Hook (`src/lib/websocket.ts`)
- 创建 `useGameWebSocket(roomId)` Hook：
  - 使用原生 `WebSocket` API（浏览器内置）
  - 自动重连机制（exponential backoff）
  - 心跳检测（ping/pong）
  - 消息解析和类型安全封装
  - 暴露 `sendAction(type, payload)` 和 `sendChat(message)` 方法
  - 连接状态：`connecting | open | closed | reconnecting`

### 5. AI 接口层 (Edge 兼容)
- `src/lib/ai.ts`：
  - 保留 OpenAI-compatible API 封装
  - 使用标准 `fetch` 调用（Edge 原生支持）
  - 从 D1 的 `aiConfig` 表读取配置（而非环境变量写死，但默认 fallback 到 env）
  - 添加超时和重试逻辑
  - 失败时降级：狼人杀读取本地预设 JSON，卧底读取本地词语数组
- 环境变量：`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`

### 6. 页面组件适配
- `src/app/lobby/page.tsx`：
  - 从 D1 获取房间列表（`GET /api/rooms`）
  - 创建房间时：D1 插入 rooms 记录 + 通过 API 初始化 DO 状态
  - 加入房间：跳转到 `/room/[id]`
- `src/app/room/[id]/page.tsx`：
  - 使用 `useGameWebSocket` 连接 WebSocket
  - 根据游戏类型渲染不同 UI（WerewolfGame / UndercoverGame）
  - 角色卡动画、倒计时、叙事面板、投票面板、聊天框全部保留
  - 聊天区改为通过 WebSocket 发送/接收，而非 Socket.IO emit/on
- `src/app/admin/*`：
  - 用户管理：D1 查询 users 表
  - AI 配置：D1 查询/更新 aiConfig 表
  - 房间管理：D1 查询 rooms 表，支持强制解散（通过 DO API 发送解散指令）

### 7. 关键数据流示例
**狼人杀夜间流程**：
1. 房主点击"开始游戏" → 客户端 WS 发送 `{type: 'start'}`
2. DO 收到后：分配角色 → `storage.put('gameData', ...)` → 广播 `{type: 'phase', phase: 'NIGHT', round: 1}`
3. 进入狼人行动：DO 广播 `{type: 'actionRequest', role: 'WEREWOLF', action: 'kill'}` 给狼人玩家
4. 狼人玩家 WS 发送 `{type: 'action', action: 'kill', target: 'userId'}`
5. DO 收集所有动作 → 结算 → 调用 AI API 生成叙事 → 广播 `{type: 'narrative', text: '...'}` 和 `{type: 'phase', phase: 'DAY'}`

### 8. 部署文件
- `wrangler.toml`：完整配置 D1 和 DO 绑定
- `.dev.vars`：本地开发环境变量模板
- `README.md` 更新：
  - 本地开发：`npm run dev` + `wrangler pages dev --d1 DB --do GAME_ROOM=GameRoom`
  - 部署：`wrangler pages deploy`
  - D1 数据库创建和迁移步骤
  - Durable Objects 不需要额外迁移，但需说明绑定关系

### 9. 代码规范
- 所有服务端代码必须兼容 Edge Runtime：不使用 `fs`, `path`, `crypto` (Node), `http`, `net`
- 使用 `bcryptjs` 替代 `bcrypt`（bcrypt 依赖 Node 原生模块）
- 使用 `jose` 替代 `jsonwebtoken`
- 使用原生 `fetch` 替代 `axios`/`node-fetch`
- 类型定义完整，特别是 WebSocket 消息协议（定义 `ServerMessage` 和 `ClientMessage` union types）

### 10. 输出顺序
请按以下顺序生成重构后的完整代码：
1. `wrangler.toml`
2. `package.json` (更新依赖)
3. `drizzle.config.ts`
4. `src/db/schema.ts`
5. `src/db/index.ts`
6. `src/lib/auth.ts` (Edge JWT)
7. `src/lib/ai.ts` (Edge fetch)
8. `src/lib/websocket.ts` (客户端 Hook)
9. `src/do/GameRoom.ts` (核心 DO 类，包含游戏逻辑)
10. `src/app/api/ws/[[...route]]/route.ts`
11. `src/app/api/rooms/route.ts` (REST API)
12. `src/app/api/auth/[...]/route.ts` (登录注册)
13. `src/app/room/[id]/page.tsx` (简化版游戏房间页面，展示 WS 连接)
14. `README.md` (部署指南)

确保代码可直接运行，配置完整，不要省略任何文件。