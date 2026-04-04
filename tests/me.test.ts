import { test, expect, vi, beforeEach } from "vitest";
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
		isActive: vi.fn(async () => true),
		getProfile: vi.fn(async () => ({
			address: "0xd0a168ef236ff5802729d1f79e4e7acac2fdfd3f",
			ensName: "alice.eth",
			firstSeen: "2026-01-01T00:00:00.000Z",
			sessionCount: 3,
		})),
	},
}));

vi.mock("../src/services/jwtService", () => ({
	jwtService: {
		verify: vi.fn(() => ({
			address: "0xd0a168ef236ff5802729d1f79e4e7acac2fdfd3f",
			sessionId: "session-123",
		})),
	},
}));

import { buildApp } from "../src/app";

beforeEach(() => {
	vi.clearAllMocks();
});

test("GET /auth/me returns wallet profile when authorized", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/auth/me",
		headers: {
			authorization: "Bearer valid-token",
		},
	});

	expect(res.statusCode).toBe(200);
	expect(res.json()).toEqual({
		address: "0xd0a168ef236ff5802729d1f79e4e7acac2fdfd3f",
		ensName: "alice.eth",
		firstSeen: "2026-01-01T00:00:00.000Z",
		sessionCount: 3,
	});
	expect(jwtService.verify).toHaveBeenCalledWith("valid-token");
	expect(sessionService.isActive).toHaveBeenCalledWith("session-123");
	expect(sessionService.getProfile).toHaveBeenCalledWith(
		"0xd0a168ef236ff5802729d1f79e4e7acac2fdfd3f",
	);

	await app.close();
});

test("GET /auth/me returns 401 when token is missing", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/auth/me",
	});

	expect(res.statusCode).toBe(401);
	expect(res.json()).toEqual({ error: "Missing token" });
	expect(sessionService.getProfile).not.toHaveBeenCalled();

	await app.close();
});
