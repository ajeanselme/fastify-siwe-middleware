import { FastifyReply, FastifyRequest } from "fastify";
import { jwtService } from "../services/jwtService";
import { sessionService } from "../services/sessionService";

export async function jwtGuard(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth) {
    return reply.code(401).send({ error: "Missing token" });
  }

  const match = auth.match(/^Bearer ([^\s]+)$/);
  if (!match) {
    return reply.code(401).send({ error: "Invalid token" });
  }

  const token = match[1];

  try {
    req.user = jwtService.verify(token);
  } catch {
    return reply.code(401).send({ error: "Invalid token" });
  }
  // Check session not revoked
  const active = await sessionService.isActive(req.user.sessionId);
  if (!active) return reply.code(401).send({ error: "Invalid token" });
}
