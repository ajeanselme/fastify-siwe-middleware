import fastify from "fastify";
import { connectRedis } from "./db/redis";
import { connectPostgres, disconnectPostgres } from "./db/client";
import { runMigrations } from "./db/migrate";
import { nonceRoute } from "./routes/nonce";
import { config } from "./config";

const app = fastify({ logger: true });

app.get("/", async (request, reply) => {
  return { hello: "world" };
});

const start = async () => {
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
    });

    await app.register(nonceRoute);
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
