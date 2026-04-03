import { FastifyInstance } from "fastify";
import { sessionService } from "../services/sessionService";
import { jwtGuard } from "../middleware/jwtGuard";

export async function meRoute(app: FastifyInstance) {
  app.get(
    "/auth/me",
    {
      preHandler: [jwtGuard],
    },
    async (req, reply) => {
      const profile = await sessionService.getProfile(req.user.address);
      return profile; // { address, ensName, firstSeen, sessionCount }
    },
  );
}
