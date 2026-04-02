import crypto from "crypto";
import { redis } from "../db/redis";

export const nonceService = {
  create: async (address: string) => {
    const nonce = crypto.randomBytes(32).toString("hex");
    await redis().set(`wsm:nonce:${address}`, nonce, "EX", 300);
    return nonce;
  },
  consume: async (address: string) => {
    return await redis().getdel(`wsm:nonce:${address}`);
  },
};
