# MultiGame Hub v2 — Cloudflare Pages 版

在线狼人杀 & 谁是卧底游戏平台，基于 Cloudflare Pages Edge Runtime 构建。

## 架构变更（v1 → v2）

| v1 (Node.js) | v2 (Edge) |
|---|---|
| Next.js 14 + Node Runtime | Next.js 14 + `@cloudflare/next-on-pages` |
| Socket.IO | Cloudflare Durable Objects + 原生 WebSocket |
| Prisma + SQLite | Drizzle ORM + Cloudflare D1 |
| NextAuth.js | 自定义 JWT（jose 库） |
| 内存状态 | Durable Object Storage |

## 技术栈

- **框架**：Next.js 14 (App Router, Edge Runtime)
- **构建**：`@cloudflare/next-on-pages`
- **实时通信**：Durable Objects + WebSocket
- **数据库**：Cloudflare D1 + Drizzle ORM
- **认证**：jose (JWT) + bcryptjs
- **样式**：Tailwind CSS + shadcn/ui
- **AI**：OpenAI-compatible API (Edge fetch)

## 快速开始

### 前置条件

- Node.js 20+
- Cloudflare 账号（开通 Pages 和 D1）
- Wrangler CLI：`npm install -g wrangler`

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 创建本地开发环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入 JWT_SECRET 和 AI 配置

# 3. 创建 D1 数据库（首次）
wrangler d1 create multigame

# 4. 更新 wrangler.toml 中的 database_id

# 5. 初始化数据库
wrangler d1 execute multigame --local --file=./migrations/0000_init.sql

# 6. 启动开发服务器（带 D1 + DO 绑定）
wrangler pages dev --d1 DB=multigame --do GAME_ROOM=GameRoom -- npm run dev
```

### 部署到 Cloudflare Pages

```bash
# 1. 配置 D1 生产数据库
wrangler d1 create multigame --env production

# 2. 更新 wrangler.toml 中的 database_id

# 3. 运行 D1 迁移
wrangler d1 execute multigame --file=./migrations/0000_init.sql

# 4. 部署
npm run deploy
```

### D1 数据库迁移

```bash
# 生成迁移
npx drizzle-kit generate

# 应用迁移到本地 D1
wrangler d1 execute multigame --local --file=./migrations/0000_init.sql

# 应用迁移到生产 D1
wrangler d1 execute multigame --file=./migrations/0000_init.sql
```

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `JWT_SECRET` | JWT 签名密钥（生产必改） | - |
| `AI_BASE_URL` | AI API 地址 | - |
| `AI_API_KEY` | AI API 密钥 | - |
| `AI_MODEL` | AI 模型名 | `gpt-4o` |
| `AI_TEMPERATURE` | AI 温度 | `0.8` |
| `AI_MAX_TOKENS` | 最大 token | `2000` |

## 项目结构

```
├── wrangler.toml             # Cloudflare 配置 (D1 + DO 绑定)
├── drizzle.config.ts         # Drizzle 配置
├── src/
│   ├── db/
│   │   ├── schema.ts         # D1 表定义
│   │   └── index.ts          # Drizzle 客户端
│   ├── do/
│   │   └── GameRoom.ts       # Durable Object（WS + 游戏逻辑）
│   ├── lib/
│   │   ├── auth.ts           # JWT + bcryptjs
│   │   ├── ai.ts             # AI API 封装 (降级)
│   │   └── websocket.ts      # 客户端 WS Hook
│   ├── app/
│   │   ├── (auth)/           # 登录/注册
│   │   ├── lobby/            # 游戏大厅
│   │   ├── room/[id]/        # 游戏房间 (WS 直连 DO)
│   │   ├── admin/            # 管理后台
│   │   └── api/              # REST API（Edge）
│   │       ├── ws/[[...route]]/   # WebSocket 升级路由
│   │       ├── auth/              # 登录/注册/me
│   │       ├── rooms/             # 房间 CRUD
│   │       └── admin/             # AI 配置
│   └── components/           # UI 组件（保留 v1）
└── README.md
```

## 关键数据流

1. 客户端通过 `useGameWebSocket` 连接 `wss://<host>/api/ws/<roomId>`
2. Edge Route 将请求 proxy 到 `GameRoom` Durable Object
3. DO 处理 WebSocket 消息、游戏逻辑、AI 调用
4. 所有状态通过 `this.ctx.storage` 持久化到 Durable Object Storage
5. 房间元数据存储在 D1 数据库中

## 游戏规则

同 v1 版本，详见原 README。
