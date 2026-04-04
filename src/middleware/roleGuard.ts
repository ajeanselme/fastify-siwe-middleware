import { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { normalizeAddress } from "../utils/address";

export type RoleGuardOptions = {
  allowlist: Iterable<string>;
};

export function roleGuard(options: RoleGuardOptions): preHandlerHookHandler {
  const allowlist = new Set(
    Array.from(options.allowlist, (address) => normalizeAddress(address)),
  );

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!allowlist.has(normalizeAddress(req.user.address))) {
      return reply.code(403).send({ error: "Unauthorized" });
    }
  };
}
