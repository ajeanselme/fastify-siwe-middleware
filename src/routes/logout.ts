import { FastifyInstance } from "fastify";
import { sessionService } from "../services/sessionService";
import { jwtService } from "../services/jwtService";
import { jwtGuard } from "../middleware/jwtGuard";
import { config } from "../config";

export async function logoutRoute(app: FastifyInstance) {
  const authGuard = jwtGuard({
    secret: config.JWT_SECRET,
    verifyToken: jwtService.verify,
    isSessionActive: sessionService.isActive,
  });

  app.delete(
    "/auth/logout",
    {
      preHandler: [authGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["success"],
            properties: {
              success: { type: "boolean" },
            },
          },
          401: {
            type: "object",
            required: ["error"],
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      await sessionService.invalidate(req.user.sessionId);
      return { success: true };
    },
  );
}
