import { FastifyInstance } from "fastify";
import Redis from "ioredis";

let redisClient: Redis | null = null;
let hasErrorHandler = false;

export function redis(): Redis {
    if (!redisClient) {
        redisClient = new Redis({
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DATABASE || "0"),
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

    if (client.status === "ready" || client.status === "connect" || client.status === "connecting") {
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