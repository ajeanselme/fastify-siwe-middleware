import { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthUser } from "../types/auth";

export type JwtGuardOptions = {
  secret?: string;
  verifyToken?: (token: string) => AuthUser;
  issuer?: string;
  isSessionActive?: (sessionId: string) => Promise<boolean>;
};

function verifyToken(token: string, secret: string, issuer?: string): AuthUser {
  const decoded = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer,
  }) as JwtPayload;

  if (!decoded.sub || typeof decoded.sub !== "string") {
    throw new Error("Invalid token payload");
  }

  if (!decoded.sessionId || typeof decoded.sessionId !== "string") {
    throw new Error("Invalid token payload");
  }

  return {
    address: decoded.sub.toLowerCase(),
    sessionId: decoded.sessionId,
  };
}

export function jwtGuard(options: JwtGuardOptions): preHandlerHookHandler {
  if (!options.verifyToken && !options.secret) {
    throw new Error("jwtGuard requires either secret or verifyToken");
  }

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return reply.code(401).send({ error: "Missing token" });
    }

    const match = auth.match(/^Bearer ([^\s]+)$/);
    if (!match) {
      return reply.code(401).send({ error: "Invalid token" });
    }

    try {
      req.user = options.verifyToken
        ? options.verifyToken(match[1])
        : verifyToken(match[1], options.secret as string, options.issuer);
    } catch {
      return reply.code(401).send({ error: "Invalid token" });
    }

    if (options.isSessionActive) {
      const active = await options.isSessionActive(req.user.sessionId);
      if (!active) {
        return reply.code(401).send({ error: "Invalid token" });
      }
    }
  };
}
