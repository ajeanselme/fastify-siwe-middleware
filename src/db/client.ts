import { FastifyInstance } from "fastify";
import { Pool, type PoolClient } from "pg";
import { config } from "../config";

function buildPostgresConnectionString() {
  const connection = new URL("postgresql://localhost");

  connection.username = config.DB_USER.trim();
  connection.password = config.DB_PASSWORD.trim();
  connection.hostname = config.DB_HOST.trim();
  connection.port = String(config.DB_PORT);
  connection.pathname = `/${config.DB_DATABASE.trim()}`;

  return connection.toString();
}

export const db = new Pool({
  connectionString: buildPostgresConnectionString(),
  options: config.DB_SCHEMA ? `-c search_path=${config.DB_SCHEMA}` : undefined,
  application_name: "web3-siwe-middleware",
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export function getPostgresConnectionString() {
  return buildPostgresConnectionString();
}

let hasErrorHandler = false;
let hasConnected = false;

export async function connectPostgres(app: FastifyInstance) {
  if (!hasErrorHandler) {
    db.on("error", (err) => app.log.error(err));
    hasErrorHandler = true;
  }

  if (hasConnected) {
    return;
  }

  await db.query("SELECT 1");
  hasConnected = true;
  app.log.info("Connected to PostgreSQL");
}

export async function disconnectPostgres(app: FastifyInstance) {
  if (!hasConnected) {
    return;
  }

  await db.end();
  hasConnected = false;
  app.log.info("Disconnected from PostgreSQL");
}

export async function withClient<T>(task: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();

  try {
    return await task(client);
  } finally {
    client.release();
  }
}
