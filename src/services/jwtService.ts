import "@fastify/jwt";
import crypto from "node:crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FastifyInstance } from "fastify";
import { db } from "../db/client";
import { normalizeAddress } from "../utils/address";
import { config } from "../config";
import type { AuthUser } from "../types/auth";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const jwtService = {
  issueAccessToken: async (
    app: FastifyInstance,
    address: string,
    sessionId: string,
  ) =>
    app.jwt.sign(
      { sub: normalizeAddress(address), sessionId, jti: crypto.randomUUID() },
      { expiresIn: "15m", iss: "siwe-middleware" },
    ),
  issue: async (app: FastifyInstance, address: string) => {
    const sessionId = crypto.randomUUID();
    const accessToken = await jwtService.issueAccessToken(
      app,
      address,
      sessionId,
    );
    const refreshToken = crypto.randomBytes(48).toString("base64url");
    // Store hashed refresh token in Postgres
    await db.query(
      "INSERT INTO sessions (id, address, refresh_hash, expires_at) VALUES ($1, $2, $3, NOW() + ($4 * interval '1 second'))",
      [
        sessionId,
        normalizeAddress(address),
        hashToken(refreshToken),
        config.REFRESH_TOKEN_TTL_SECONDS,
      ],
    );
    return { accessToken, refreshToken };
  },
  verify: (token: string): AuthUser => {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "siwe-middleware",
    }) as JwtPayload;

    if (!decoded.sub || typeof decoded.sub !== "string") {
      throw new Error("Invalid token payload");
    }
    if (!decoded.sessionId || typeof decoded.sessionId !== "string") {
      throw new Error("Invalid token payload");
    }

    return {
      address: normalizeAddress(decoded.sub),
      sessionId: decoded.sessionId,
    };
  },
};
