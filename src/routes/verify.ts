import { FastifyInstance, FastifyRequest } from "fastify";
import { SiweMessage } from "siwe/dist/client";
import { config } from "../config";
import { jwtService } from "../services/jwtService";
import { nonceService } from "../services/nonceService";
import { sessionService } from "../services/sessionService";
import { normalizeAddress } from "../utils/address";

export async function verifyRoute(app: FastifyInstance) {
  app.post(
    "/auth/verify",
    {
      schema: {
        body: {
          type: "object",
          required: ["message", "signature"],
          properties: {
            message: { type: "string" },
            signature: { type: "string" },
          },
        },
      },
    },
    async (
      req: FastifyRequest<{ Body: { message: string; signature: string } }>,
      reply,
    ) => {
      const { message, signature } = req.body;
      const siweMsg = new SiweMessage(message);

      if (siweMsg.domain !== config.ALLOWED_DOMAIN) {
        reply.code(400);
        return { error: "Invalid domain" };
      }
      if (
        config.CHAIN_ID !== undefined &&
        siweMsg.chainId !== config.CHAIN_ID
      ) {
        reply.code(400);
        return { error: "Invalid chain" };
      }

      const { data } = await siweMsg.verify({ signature });
      const address = normalizeAddress(data.address);

      const stored = await nonceService.consume(address);
      if (!stored || stored !== siweMsg.nonce) {
        reply.code(400);
        return { error: "Invalid nonce" };
      }

      await sessionService.upsertProfile(address);

      const { accessToken, refreshToken } = await jwtService.issue(
        app,
        address,
      );
      return { accessToken, refreshToken };
    },
  );
}
