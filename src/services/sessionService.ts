import { db, withClient } from "../db/client";
import { normalizeAddress } from "../utils/address";
import crypto from "crypto";

export const sessionService = {
  getProfile: async (address: string) => {
    const result = await db.query(
      `SELECT address, ens_name AS "ensName", first_seen_at AS "firstSeen", session_count AS "sessionCount"
       FROM wallet_profiles
       WHERE address = $1`,
      [normalizeAddress(address)],
    );

    return result.rows[0] ?? null;
  },
  upsertProfile: (address: string, ensName?: string | null) =>
    db.query(
      `INSERT INTO wallet_profiles (address, ens_name, session_count) VALUES ($1, $2, 1)
     ON CONFLICT (address) DO UPDATE
     SET last_seen_at = NOW(),
         session_count = wallet_profiles.session_count + 1,
         ens_name = COALESCE(EXCLUDED.ens_name, wallet_profiles.ens_name)
     RETURNING *`,
      [normalizeAddress(address), ensName ?? null],
    ),
  invalidate: (sessionId: string) =>
    db.query(`UPDATE sessions SET revoked_at = NOW() WHERE id = $1`, [
      sessionId,
    ]),
  isActive: (sessionId: string) =>
    db
      .query(`SELECT 1 FROM sessions WHERE id = $1 AND revoked_at IS NULL`, [
        sessionId,
      ])
      .then((result) => result.rows.length > 0),
  rotateRefreshToken: async (refreshToken: string) => {
    const currentHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const nextRefreshToken = crypto.randomBytes(48).toString("base64url");
    const nextHash = crypto
      .createHash("sha256")
      .update(nextRefreshToken)
      .digest("hex");
    return withClient(async (client) => {
      await client.query("BEGIN");

      try {
        const currentSession = await client.query(
          `UPDATE sessions
           SET revoked_at = NOW()
           WHERE refresh_hash = $1 AND revoked_at IS NULL
           RETURNING address`,
          [currentHash],
        );

        if (currentSession.rows.length === 0) {
          throw new Error("Invalid refresh token");
        }

        const sessionId = crypto.randomUUID();
        const nextSession = await client.query(
          `INSERT INTO sessions (id, address, refresh_hash)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [sessionId, currentSession.rows[0].address, nextHash],
        );

        await client.query("COMMIT");

        return {
          session: nextSession.rows[0],
          refreshToken: nextRefreshToken,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  },
};
