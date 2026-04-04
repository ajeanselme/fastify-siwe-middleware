import { test, expect, vi, beforeEach } from "vitest";
import { Wallet } from "ethers";
import { SiweMessage } from "siwe";
import { nonceService } from "../src/services/nonceService";
import { sessionService } from "../src/services/sessionService";
import { jwtService } from "../src/services/jwtService";
import { ensService } from "../src/services/ensService";

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

vi.mock("../src/services/nonceService", () => ({
	nonceService: {
		consume: vi.fn(),
	},
}));

vi.mock("../src/services/sessionService", () => ({
	sessionService: {
		upsertProfile: vi.fn(async (address: string) => ({ address })),
	},
}));

vi.mock("../src/services/jwtService", () => ({
	jwtService: {
		issue: vi.fn(async () => ({
			accessToken: "access-token",
			refreshToken: "refresh-token",
		})),
	},
}));

vi.mock("../src/services/ensService", () => ({
	ensService: {
		resolveName: vi.fn(async () => null),
	},
}));

import { buildApp } from "../src/app";

beforeEach(() => {
	vi.clearAllMocks();
});

test("POST /auth/verify issues tokens for a valid SIWE message", async () => {
	const app = await buildApp();
	const wallet = Wallet.createRandom();
	const nonce = "testnonce123";
	vi.mocked(nonceService.consume).mockResolvedValueOnce(nonce);

	const message = new SiweMessage({
		domain: "localhost",
		address: wallet.address,
		statement: "Sign in",
		nonce,
		chainId: 31337,
		uri: "http://localhost",
		version: "1",
	});

	const preparedMessage = message.prepareMessage();
	const signature = await wallet.signMessage(preparedMessage);

	const res = await app.inject({
		method: "POST",
		url: "/auth/verify",
		payload: { message: preparedMessage, signature },
	});

	expect(res.statusCode).toBe(200);
	expect(res.json()).toEqual({
		accessToken: "access-token",
		refreshToken: "refresh-token",
	});
	expect(nonceService.consume).toHaveBeenCalledWith(
		wallet.address.toLowerCase(),
	);
	expect(ensService.resolveName).toHaveBeenCalledWith(
		wallet.address.toLowerCase(),
	);
	expect(sessionService.upsertProfile).toHaveBeenCalledWith(
		wallet.address.toLowerCase(),
		null,
	);

	const jwtCalls = vi.mocked(jwtService.issue).mock.calls;
	expect(jwtCalls.length).toBe(1);
	const [, issuedAddress] = jwtCalls[0] ?? [];
	expect(issuedAddress).toBe(wallet.address.toLowerCase());

	await app.close();
});

test("POST /auth/verify returns 400 for an invalid nonce", async () => {
	const app = await buildApp();
	const wallet = Wallet.createRandom();
	const nonce = "expectednonce";
	vi.mocked(nonceService.consume).mockResolvedValueOnce("differentnonce");

	const message = new SiweMessage({
		domain: "localhost",
		address: wallet.address,
		statement: "Sign in",
		nonce,
		chainId: 31337,
		uri: "http://localhost",
		version: "1",
	});

	const preparedMessage = message.prepareMessage();
	const signature = await wallet.signMessage(preparedMessage);

	const res = await app.inject({
		method: "POST",
		url: "/auth/verify",
		payload: { message: preparedMessage, signature },
	});

	expect(res.statusCode).toBe(400);
	expect(res.json()).toEqual({ error: "Invalid nonce" });
	expect(sessionService.upsertProfile).not.toHaveBeenCalled();
	expect(jwtService.issue).not.toHaveBeenCalled();

	await app.close();
});
