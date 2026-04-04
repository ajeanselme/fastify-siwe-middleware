import { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config";
import { sessionService } from "../services/sessionService";
import { jwtService } from "../services/jwtService";

export async function refreshRoute(app: FastifyInstance) {
  app.post(
    "/auth/refresh",
    {
      config: {
        rateLimit: {
          max: config.REFRESH_RATE_LIMIT_MAX,
          timeWindow: config.REFRESH_RATE_LIMIT_WINDOW_MS,
        },
      },
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
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          /refresh token/i.test(err.message)
        ) {
          return reply.code(401).send({ error: "Invalid refresh token" });
        }

        req.log.error({ err }, "Unexpected error during token refresh");
        return reply
          .code(500)
          .send({ error: "Unable to refresh token at this time" });
      }
    },
  );
}
