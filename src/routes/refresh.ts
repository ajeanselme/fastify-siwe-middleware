import { FastifyInstance, FastifyRequest } from "fastify";
import { sessionService } from "../services/sessionService";
import { jwtService } from "../services/jwtService";

export async function refreshRoute(app: FastifyInstance) {
  app.post(
    "/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              minLength: 16,
              maxLength: 2048,
            },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { refreshToken: string } }>, reply) => {
      try {
        const { refreshToken } = req.body;

        const { session, refreshToken: newRefreshToken } =
          await sessionService.rotateRefreshToken(refreshToken);
        const accessToken = await jwtService.issueAccessToken(
          app,
          session.address,
          session.id,
        );
        return { accessToken, refreshToken: newRefreshToken };
      } catch (err) {
        return reply.code(401).send({ error: "Invalid refresh token" });
      }
    },
  );
}
