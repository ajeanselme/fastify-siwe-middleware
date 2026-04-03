import { FastifyReply, FastifyRequest } from "fastify";
import { jwtService } from "../services/jwtService";
import { sessionService } from "../services/sessionService";

export async function jwtGuard(req: FastifyRequest, reply: FastifyReply) {
  console.log(req.headers.authorization);
  const token = req.headers.authorization?.slice(7);
  if (!token) {
    return reply.code(401).send({ error: "Missing token" });
  }

  try {
    req.user = jwtService.verify(token);
  } catch {
    return reply.code(401).send({ error: "Missing token" });
  }
  // Check session not revoked
  const active = await sessionService.isActive(req.user.sessionId);
  if (!active) return reply.code(401).send({ error: "Missing token" });
}
