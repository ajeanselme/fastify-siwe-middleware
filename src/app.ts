import fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { pathToFileURL } from "node:url";
import { connectRedis, disconnectRedis } from "./db/redis";
import { connectPostgres, disconnectPostgres } from "./db/client";
import { runMigrations } from "./db/migrate";
import { nonceRoute } from "./routes/nonce";
import { verifyRoute } from "./routes/verify";
import { config } from "./config";
import { meRoute } from "./routes/me";

export async function buildApp() {
  const app = fastify({ logger: true });

  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: "1h",
      algorithm: "HS256",
    },
  });

  app.get("/", async () => {
    return { hello: "world" };
  });

  await app.register(nonceRoute);
  await app.register(verifyRoute);
  await app.register(meRoute);

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

    await app.listen({ port: 3001 });
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
