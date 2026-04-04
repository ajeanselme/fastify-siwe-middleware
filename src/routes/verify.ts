import { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config";
import { jwtService } from "../services/jwtService";
import { nonceService } from "../services/nonceService";
import { ensService } from "../services/ensService";
import { sessionService } from "../services/sessionService";
import { normalizeAddress } from "../utils/address";
import { SiweMessage } from "siwe";

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
      let siweMsg: SiweMessage;
      try {
        siweMsg = new SiweMessage(message);
      } catch {
        return reply.code(401).send({ error: "Authentication failed" });
      }

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

      let address: string;
      try {
        const verification = await siweMsg.verify({ signature });
        if (!verification.success) {
          return reply.code(401).send({ error: "Authentication failed" });
        }

        address = normalizeAddress(verification.data.address);
      } catch {
        return reply.code(401).send({ error: "Authentication failed" });
      }

      const stored = await nonceService.consume(address);
      if (!stored || stored !== siweMsg.nonce) {
        reply.code(400);
        return { error: "Invalid nonce" };
      }

      const ensName = await ensService.resolveName(address);
      await sessionService.upsertProfile(address, ensName);

      const { accessToken, refreshToken } = await jwtService.issue(
        app,
        address,
      );
      return { accessToken, refreshToken };
    },
  );
}
