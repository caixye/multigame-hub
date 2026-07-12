import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 用户表
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // bcryptjs hash
  role: text("role").notNull().default("USER"), // ADMIN | USER
  createdAt: integer("created_at").notNull(),
});

// 房间表（D1 存储元数据，DO 存储实时状态）
export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  gameType: text("game_type").notNull(), // WEREWOLF | UNDERCOVER
  status: text("status").notNull().default("WAITING"), // WAITING | PLAYING | ENDED
  maxPlayers: integer("max_players").notNull(),
  hostId: text("host_id").notNull(),
  doNamespaceId: text("do_namespace_id").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

// AI 配置表
export const aiConfigs = sqliteTable("ai_configs", {
  id: text("id").primaryKey(),
  baseURL: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  modelName: text("model_name").notNull(),
  temperature: integer("temperature").notNull().default(80), // 存整数 0-200 代表 0.0-2.0
  maxTokens: integer("max_tokens").notNull().default(2000),
  isActive: integer("is_active").notNull().default(1), // 0/1
  updatedAt: integer("updated_at").notNull(),
});

// 游戏历史战绩
export const gameHistory = sqliteTable("game_history", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  roomName: text("room_name").notNull(),
  gameType: text("game_type").notNull(),
  winner: text("winner").notNull(),
  players: text("players").notNull(), // JSON 字符串
  rounds: integer("rounds").notNull().default(0),
  endedAt: integer("ended_at").notNull(),
});
