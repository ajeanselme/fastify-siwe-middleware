import { FastifyRequest } from "fastify";

export function roleGuard(allowlist: Set<string>) {
  return async (req: FastifyRequest) => {
    if (!allowlist.has(req.user.address.toLowerCase())) {
      return { error: "Unauthorized" };
    }
  };
}
