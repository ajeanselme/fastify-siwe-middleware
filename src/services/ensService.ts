import { JsonRpcProvider } from "ethers";
import { config } from "../config";

const provider = config.RPC_URL ? new JsonRpcProvider(config.RPC_URL) : null;

export const ensService = {
  resolveName: async (address: string): Promise<string | null> => {
    if (!provider) {
      return null;
    }

    try {
      const ensName = await provider.lookupAddress(address);
      return ensName ?? null;
    } catch {
      return null;
    }
  },
};
