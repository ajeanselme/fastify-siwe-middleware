import "@fastify/jwt";
import type { AuthJwtPayload, AuthUser } from "./auth";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthJwtPayload;
    user: AuthUser;
  }
}

export {};
