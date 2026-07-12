/**
 * Cloudflare Workers / Durable Objects 类型声明
 * 这些类型在运行时由 Cloudflare 提供，编译时使用声明
 */
declare global {
  interface DurableObjectState {
    storage: DurableObjectStorage;
    acceptWebSocket(ws: WebSocket): void;
    getWebSockets(): WebSocket[];
    blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>;
    waitUntil(promise: Promise<any>): void;
  }

  interface DurableObjectStorage {
    get<T = unknown>(key: string, options?: DurableObjectGetOptions): Promise<T | undefined>;
    get<T = unknown>(keys: string[], options?: DurableObjectGetOptions): Promise<Map<string, T>>;
    put<T>(key: string, value: T, options?: DurableObjectPutOptions): Promise<void>;
    put<T>(entries: Record<string, T>, options?: DurableObjectPutOptions): Promise<void>;
    delete(key: string, options?: DurableObjectPutOptions): Promise<boolean>;
    delete(keys: string[], options?: DurableObjectPutOptions): Promise<number>;
    deleteAll(options?: DurableObjectPutOptions): Promise<void>;
    list(options?: DurableObjectListOptions): Promise<Map<string, any>>;
    transaction<T>(fn: (txn: DurableObjectTransaction) => Promise<T>): Promise<T>;
    getAlarm(options?: DurableObjectGetAlarmOptions): Promise<number | null>;
    setAlarm(scheduledTime: number | Date, options?: DurableObjectSetAlarmOptions): Promise<void>;
    deleteAlarm(options?: DurableObjectSetAlarmOptions): Promise<void>;
    sync(): Promise<void>;
  }

  interface DurableObjectGetOptions { allowConcurrency?: boolean; noCache?: boolean; }
  interface DurableObjectPutOptions { allowConcurrency?: boolean; allowUnconfirmed?: boolean; noCache?: boolean; }
  interface DurableObjectListOptions { start?: string; startAfter?: string; end?: string; prefix?: string; reverse?: boolean; limit?: number; allowConcurrency?: boolean; noCache?: boolean; }
  interface DurableObjectTransaction {}
  interface DurableObjectGetAlarmOptions { allowConcurrency?: boolean; }
  interface DurableObjectSetAlarmOptions { allowConcurrency?: boolean; allowUnconfirmed?: boolean; }

  class DurableObject {
    protected ctx: DurableObjectState;
    constructor(ctx: DurableObjectState, env: any);
    fetch(request: Request): Response | Promise<Response>;
    alarm?(alarmInfo?: AlarmInvocationInfo): void | Promise<void>;
    webSocketMessage?(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void>;
    webSocketClose?(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void>;
    webSocketError?(ws: WebSocket, error: Error): void | Promise<void>;
  }

  interface AlarmInvocationInfo { scheduledTime: number; }

  interface WebSocketPair {
    0: WebSocket;
    1: WebSocket;
  }

  var WebSocketPair: { new (): WebSocketPair };

  interface DurableObjectNamespace {
    idFromName(name: string): DurableObjectId;
    idFromString(id: string): DurableObjectId;
    newUniqueId(): DurableObjectId;
    get(id: DurableObjectId): DurableObjectStub;
  }

  interface DurableObjectId { toString(): string; }
  interface DurableObjectStub { fetch(request: Request): Promise<Response>; }

  // KEEP these to stay compatible with standard TS lib
  interface WebSocket {
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;
    readonly url: string;
    readonly readyState: number;
    readonly bufferedAmount: number;
    onopen: ((event: Event) => void) | null;
    onclose: ((event: CloseEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    binaryType: BinaryType;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    dispatchEvent(event: Event): boolean;
    static readonly READY_STATE_OPEN: 1;
  }
}


// D1 Database type (Cloudflare Workers)
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  dump(): Promise<ArrayBuffer>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}
export {};
