import { FastifyInstance } from "fastify";
import { sessionService } from "../services/sessionService";
import { jwtGuard } from "../middleware/jwtGuard";

export async function logoutRoute(app: FastifyInstance) {
  app.delete(
    "/auth/logout",
    {
      preHandler: [jwtGuard],
    },
    async (req, reply) => {
      await sessionService.invalidate(req.user.sessionId);
      return { success: true };
    },
  );
}
