import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// D1Database type declaration (provided by Cloudflare Workers runtime)
declare class D1Database {
  prepare(query: string): any;
  exec(query: string): Promise<any>;
  batch<T = unknown>(statements: any[]): Promise<any>;
  dump(): Promise<ArrayBuffer>;
}

/**
 * Create D1 database client
 * Uses Cloudflare Pages env.DB binding
 */
export function createDB(d1Binding: D1Database) {
  return drizzle(d1Binding, { schema });
}

/** Type exports */
export type DB = ReturnType<typeof createDB>;
export * from "./schema";
