import { db } from "../db/client";
import { normalizeAddress } from "../utils/address";

export const sessionService = {
  upsertProfile: (address: string) =>
    db.query(
      `INSERT INTO wallet_profiles (address) VALUES ($1)
     ON CONFLICT (address) DO UPDATE SET last_seen_at = NOW()
     RETURNING *`,
      [normalizeAddress(address)],
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
};
