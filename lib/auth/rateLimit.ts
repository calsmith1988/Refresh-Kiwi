import net from "node:net";
import tls from "node:tls";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();
const DEFAULT_MESSAGE = "Too many attempts. Please wait a moment and try again.";

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function rateLimitHeaders(error: RateLimitError): HeadersInit {
  return { "Retry-After": String(error.retryAfterSeconds) };
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  message?: string;
}

function getRateLimitRedisUrl(): string | null {
  return (
    process.env.RATE_LIMIT_REDIS_URL?.trim() ||
    process.env.REDIS_URL?.trim() ||
    null
  );
}

function retryAfter(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

function assertMemoryRateLimit(key: string, options: RateLimitOptions): void {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (entry.count >= options.limit) {
    throw new RateLimitError(
      options.message ?? DEFAULT_MESSAGE,
      retryAfter(entry.resetAt),
    );
  }

  entry.count += 1;
}

function encodeRedisCommand(command: Array<string | number>): string {
  const parts = [`*${command.length}`];

  for (const value of command) {
    const stringValue = String(value);
    parts.push(`$${Buffer.byteLength(stringValue)}`, stringValue);
  }

  return `${parts.join("\r\n")}\r\n`;
}

function parseRedisResponse(buffer: Buffer): string | number | null {
  const prefix = String.fromCharCode(buffer[0]);
  const text = buffer.toString("utf8");
  const lineEnd = text.indexOf("\r\n");

  if (lineEnd === -1) {
    return null;
  }

  const line = text.slice(1, lineEnd);

  if (prefix === "+") {
    return line;
  }

  if (prefix === ":") {
    return Number(line);
  }

  if (prefix === "-") {
    throw new Error(`Redis error: ${line}`);
  }

  if (prefix === "$") {
    const length = Number(line);

    if (length === -1) {
      return null;
    }

    const start = lineEnd + 2;
    const end = start + length;

    if (buffer.length < end + 2) {
      return null;
    }

    return buffer.toString("utf8", start, end);
  }

  throw new Error(`Unsupported Redis response: ${prefix}`);
}

function connectRedis(redisUrl: string): Promise<net.Socket | tls.TLSSocket> {
  const parsed = new URL(redisUrl);
  const port = Number(parsed.port || 6379);
  const host = parsed.hostname;

  return new Promise((resolve, reject) => {
    const socket =
      parsed.protocol === "rediss:"
        ? tls.connect({ host, port, servername: host })
        : net.connect({ host, port });
    const onConnect = () => {
      socket.off("error", reject);
      resolve(socket);
    };

    socket.once(parsed.protocol === "rediss:" ? "secureConnect" : "connect", onConnect);
    socket.once("error", reject);
    socket.setTimeout(5_000, () => {
      socket.destroy(new Error("Redis connection timed out"));
    });
  });
}

async function sendRedisCommand(
  socket: net.Socket | tls.TLSSocket,
  command: Array<string | number>,
): Promise<string | number | null> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onData = (chunk: Buffer) => {
      try {
        buffer = Buffer.concat([buffer, chunk]);
        const parsed = parseRedisResponse(buffer);

        if (parsed !== null) {
          cleanup();
          resolve(parsed);
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    socket.on("data", onData);
    socket.on("error", onError);
    socket.write(encodeRedisCommand(command));
  });
}

async function withRedis<T>(
  redisUrl: string,
  callback: (socket: net.Socket | tls.TLSSocket) => Promise<T>,
): Promise<T> {
  const parsed = new URL(redisUrl);
  const socket = await connectRedis(redisUrl);

  try {
    const username = decodeURIComponent(parsed.username);
    const password = decodeURIComponent(parsed.password);

    if (password) {
      await sendRedisCommand(
        socket,
        username ? ["AUTH", username, password] : ["AUTH", password],
      );
    }

    const db = parsed.pathname.replace("/", "");
    if (db) {
      await sendRedisCommand(socket, ["SELECT", db]);
    }

    return await callback(socket);
  } finally {
    socket.end();
  }
}

async function assertRedisRateLimit(
  key: string,
  options: RateLimitOptions,
  redisUrl: string,
): Promise<void> {
  const redisKey = `refresh-kiwi:rate-limit:${key}`;
  await withRedis(redisUrl, async (socket) => {
    const count = Number(await sendRedisCommand(socket, ["INCR", redisKey]));

    if (count === 1) {
      await sendRedisCommand(socket, ["PEXPIRE", redisKey, options.windowMs]);
    }

    if (count <= options.limit) {
      return;
    }

    const ttl = Number(await sendRedisCommand(socket, ["PTTL", redisKey]));

    throw new RateLimitError(
      options.message ?? DEFAULT_MESSAGE,
      Math.max(1, Math.ceil(Math.max(ttl, 0) / 1000)),
    );
  });
}

export async function assertRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<void> {
  const redisUrl = getRateLimitRedisUrl();

  if (!redisUrl) {
    assertMemoryRateLimit(key, options);
    return;
  }

  try {
    await assertRedisRateLimit(key, options, redisUrl);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }

    console.error("[refresh-kiwi] shared rate limiter unavailable", error);
    assertMemoryRateLimit(key, options);
  }
}

export function rateLimitKey(request: Request, scope: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

  return `${scope}:${ip}`;
}
