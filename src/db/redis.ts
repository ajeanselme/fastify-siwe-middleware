import { FastifyInstance } from "fastify";
import Redis from "ioredis";
import { config } from "../config";

let redisClient: Redis | null = null;
let hasErrorHandler = false;

export function redis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.REDIS_HOST || "localhost",
      port: config.REDIS_PORT ?? 6379,
      password: config.REDIS_PASSWORD || undefined,
      db: config.REDIS_DATABASE ?? 0,
      lazyConnect: true,
    });
  }

  return redisClient;
}

export async function connectRedis(app: FastifyInstance) {
  const client = redis();

  if (!hasErrorHandler) {
    client.on("error", (err) => app.log.error(err));
    hasErrorHandler = true;
  }

  if (
    client.status === "ready" ||
    client.status === "connect" ||
    client.status === "connecting"
  ) {
    return;
  }

  await client.connect();
  app.log.info("Connected to Redis");
}

export async function disconnectRedis(app: FastifyInstance) {
  if (!redisClient) {
    return;
  }

  redisClient.disconnect();
  app.log.info("Disconnected from Redis");
}
