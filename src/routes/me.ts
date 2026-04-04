import { FastifyInstance } from "fastify";
import { sessionService } from "../services/sessionService";
import { jwtService } from "../services/jwtService";
import { jwtGuard } from "../middleware/jwtGuard";
import { config } from "../config";

export async function meRoute(app: FastifyInstance) {
  const authGuard = jwtGuard({
    secret: config.JWT_SECRET,
    verifyToken: jwtService.verify,
    isSessionActive: sessionService.isActive,
  });

  app.get(
    "/auth/me",
    {
      preHandler: [authGuard],
    },
    async (req, reply) => {
      const profile = await sessionService.getProfile(req.user.address);
      return profile; // { address, ensName, firstSeen, sessionCount }
    },
  );
}
