import fastify from "fastify";
import { connectRedis } from "./db/redis";
import { nonceRoute } from "./routes/nonce";

const app = fastify({ logger: true });

app.get("/", async (request, reply) => {
  return { hello: "world" };
});

const start = async () => {

  try {
    process.loadEnvFile("./.env");
    await connectRedis(app);

    await app.register(nonceRoute);
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();