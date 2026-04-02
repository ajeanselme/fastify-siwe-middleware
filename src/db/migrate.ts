import { FastifyInstance } from "fastify";
import { runner } from "node-pg-migrate";
import { getPostgresConnectionString } from "./client";
import { config } from "../config";

export async function runMigrations(app: FastifyInstance) {
  const result = await runner({
    databaseUrl: getPostgresConnectionString(),
    dir: "src/db/migrations",
    direction: "up",
    migrationsTable: "pgmigrations",
    schema: config.DB_SCHEMA,
    createSchema: Boolean(config.DB_SCHEMA),
    createMigrationsSchema: Boolean(config.DB_SCHEMA),
    logger: app.log,
    singleTransaction: true,
  });

  if (result.length > 0) {
    app.log.info(
      { migrations: result.map((migration) => migration.name) },
      "Migrations applied",
    );
  } else {
    app.log.info("No migrations to run");
  }
}
