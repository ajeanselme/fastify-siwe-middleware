import { ethers } from "ethers";
import { FastifyRequest } from "fastify";
import { config } from "../config";

export function onChainGuard(contractAddress: string, minBalance: bigint) {
  return async (req: FastifyRequest) => {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const erc20 = new ethers.Contract(contractAddress, "ERC20_ABI", provider);
    const balance: bigint = await erc20.balanceOf(req.user.address);
    if (balance < minBalance) return { error: "Insufficient on-chain balance" };
  };
}
