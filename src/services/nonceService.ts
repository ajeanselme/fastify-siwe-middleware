import crypto from "crypto";
import { redis } from "../db/redis";
import { normalizeAddress } from "../utils/address";

export const nonceService = {
  create: async (address: string) => {
    const nonce = crypto.randomBytes(32).toString("hex");
    await redis().set(`wsm:nonce:${normalizeAddress(address)}`, nonce, "EX", 300);
    return nonce;
  },
  consume: async (address: string) => {
    return await redis().getdel(`wsm:nonce:${normalizeAddress(address)}`);
  },
};
