import fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { pathToFileURL } from "node:url";
import { connectRedis, disconnectRedis } from "./db/redis";
import { connectPostgres, disconnectPostgres } from "./db/client";
import { runMigrations } from "./db/migrate";
import { nonceRoute } from "./routes/nonce";
import { verifyRoute } from "./routes/verify";
import { config } from "./config";
import { meRoute } from "./routes/me";
import { refreshRoute } from "./routes/refresh";
import { logoutRoute } from "./routes/logout";

export async function buildApp() {
  const app = fastify({
    logger: true,
    bodyLimit: config.BODY_LIMIT_BYTES,
  });

  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: "1h",
      algorithm: "HS256",
    },
  });

  await app.register(fastifyRateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Fastify SIWE Auth API",
        description: "Sign-In With Ethereum authentication endpoints",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });

  app.get("/", async () => {
    return { hello: "world" };
  });

  await app.register(nonceRoute);
  await app.register(verifyRoute);
  await app.register(meRoute);
  await app.register(refreshRoute);
  await app.register(logoutRoute);

  return app;
}

export async function start() {
  const app = await buildApp();

  try {
    app.log.info(
      { allowedDomain: config.ALLOWED_DOMAIN, chainId: config.CHAIN_ID },
      "Loaded config",
    );

    await runMigrations(app);
    await connectRedis(app);
    await connectPostgres(app);

    app.addHook("onClose", async () => {
      await disconnectPostgres(app);
      await disconnectRedis(app);
    });

    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

const isMainModule =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  start();
}
