import { test, expect, vi } from "vitest";
import { sessionService } from "../src/services/sessionService";
import { jwtService } from "../src/services/jwtService";

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
  },
}));

vi.mock("../src/services/sessionService", () => ({
  sessionService: {
    rotateRefreshToken: vi.fn(async () => ({
      session: {
        id: "session-123",
        address: "0xd0a168ef236ff5802729d1f79e4e7acac2fdfd3f",
      },
      refreshToken: "new-refresh-token",
    })),
  },
}));

vi.mock("../src/services/jwtService", () => ({
  jwtService: {
    issueAccessToken: vi.fn(
      async () => "access-token",
    ),
  },
}));

import { buildApp } from "../src/app";

test("POST /auth/refresh rotates refresh token without creating a new session", async () => {
  const app = await buildApp();

  const res = await app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: { refreshToken: "old-refresh-token" },
  });

  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({
    accessToken: "access-token",
    refreshToken: "new-refresh-token",
  });
  expect(sessionService.rotateRefreshToken).toHaveBeenCalledWith(
    "old-refresh-token",
  );
  const calls = vi.mocked(jwtService.issueAccessToken).mock.calls;
  expect(calls.length).toBe(1);
  const [, issuedAddress, issuedSessionId] = calls[0] ?? [];
  expect(issuedAddress).toBe("0xd0a168ef236ff5802729d1f79e4e7acac2fdfd3f");
  expect(issuedSessionId).toBe("session-123");

  await app.close();
});
