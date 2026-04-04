import { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config";
import { nonceService } from "../services/nonceService";
import { normalizeAddress } from "../utils/address";

export async function nonceRoute(app: FastifyInstance) {
  app.get(
    "/auth/nonce",
    {
      config: {
        rateLimit: {
          max: config.NONCE_RATE_LIMIT_MAX,
          timeWindow: config.NONCE_RATE_LIMIT_WINDOW_MS,
        },
      },
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["address"],
          properties: {
            address: {
              type: "string",
              minLength: 42,
              maxLength: 42,
              pattern: "^0x[a-fA-F0-9]{40}$",
            },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["nonce"],
            properties: {
              nonce: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { address: string } }>,
      reply,
    ) => {
      const { address } = request.query;
      const nonce = await nonceService.create(normalizeAddress(address));
      return reply.send({ nonce });
    },
  );
}
