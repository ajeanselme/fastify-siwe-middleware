import { test, expect, vi } from "vitest";
import { nonceService } from "../src/services/nonceService";
import { buildApp } from "../src/app";

vi.mock("../src/config", () => ({
  config: {
    DB_HOST: "localhost",
    DB_PORT: 5432,
    DB_USER: "postgres",
    DB_PASSWORD: "postgres",
    DB_DATABASE: "postgres",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    ALLOWED_DOMAIN: "localhost",
    CHAIN_ID: 31337,
    JWT_SECRET: "test-secret",
    BODY_LIMIT_BYTES: 8192,
  },
}));

vi.mock("../src/services/nonceService", () => ({
  nonceService: {
    create: vi.fn(async () => "a".repeat(64)),
  },
}));

test("GET /auth/nonce returns a 64-char hex nonce", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/auth/nonce?address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  });
  expect(res.statusCode).toBe(200);
  expect(res.json().nonce).toMatch(/^[a-f0-9]{64}$/);
  expect(nonceService.create).toHaveBeenCalledWith(
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  );
  app.log.info({ nonce: res.json().nonce }, "Received nonce");
  await app.close();
});
