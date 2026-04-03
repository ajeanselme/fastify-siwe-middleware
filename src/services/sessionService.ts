import { db } from "../db/client";
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
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const result = await db.query(
      `UPDATE sessions SET refresh_hash = $1, updated_at = NOW()
       WHERE refresh_hash = $2 AND revoked_at IS NULL
       RETURNING *`,
      [hash, hash],
    );
    if (result.rows.length === 0) {
      throw new Error("Invalid refresh token");
    }
    return result.rows[0];
  },
};
