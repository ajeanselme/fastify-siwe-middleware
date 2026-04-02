import { FastifyInstance, FastifyRequest } from "fastify";
import { nonceService } from "../services/nonceService";

export async function nonceRoute(app: FastifyInstance) {
  app.get(
    "/auth/nonce",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["address"],
          properties: {
            address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
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
      const nonce = await nonceService.create(address);
      return reply.send({ nonce });
    },
  );
}
