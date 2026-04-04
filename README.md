# web3-siwe-middleware

Fastify middleware helpers for SIWE-based auth flows.

## Install

```bash
npm install web3-siwe-middleware
```

## Public API

The package exports three middleware factories from the package root:

- `jwtGuard`
- `onChainGuard`
- `roleGuard`

It also exports the shared auth types:

- `AuthUser`
- `AuthJwtPayload`

## Usage

```ts
import fastify from "fastify";
import {
  jwtGuard,
  onChainGuard,
  roleGuard,
} from "web3-siwe-middleware";

const app = fastify();

const authGuard = jwtGuard({
  secret: process.env.JWT_SECRET!,
  isSessionActive: async (sessionId) => {
    return sessionId.length > 0;
  },
});

app.get("/private", { preHandler: [authGuard] }, async (req) => {
  return { address: req.user.address };
});

app.get(
  "/token-gated",
  {
    preHandler: [
      authGuard,
      onChainGuard({
        rpcUrl: process.env.RPC_URL!,
        contractAddress: "0x0000000000000000000000000000000000000000",
        minBalance: 1n,
      }),
      roleGuard({
        allowlist: ["0x1234567890abcdef1234567890abcdef12345678"],
      }),
    ],
  },
  async () => {
    return { ok: true };
  },
);
```

## Build

```bash
npm run build
```

This emits ESM, CommonJS, and declaration files in `dist/`.
