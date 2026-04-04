import { ethers } from "ethers";
import { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";

const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];

export type OnChainGuardOptions = {
  rpcUrl: string;
  contractAddress: string;
  minBalance: bigint;
};

export function onChainGuard(
  options: OnChainGuardOptions,
): preHandlerHookHandler {
  const provider = new ethers.JsonRpcProvider(options.rpcUrl);
  const erc20 = new ethers.Contract(
    options.contractAddress,
    ERC20_ABI,
    provider,
  );

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const balance = (await erc20.balanceOf(req.user.address)) as bigint;
    if (balance < options.minBalance) {
      return reply
        .code(403)
        .send({ error: "Insufficient on-chain balance" });
    }
  };
}
