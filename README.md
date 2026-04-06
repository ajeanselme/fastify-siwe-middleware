# fastify-siwe-middleware

Fastify middleware helpers for SIWE-based auth flows.

## Install

```bash
npm install fastify-siwe-middleware
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
} from "fastify-siwe-middleware";

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

## Served routes

When running this application as an auth service, it exposes the routes below.

### `GET /docs`

- Auth: none
- Description: Interactive Swagger UI for all API routes.

### `GET /docs/json`

- Auth: none
- Description: Generated OpenAPI JSON document used by Swagger UI.

### `GET /`

- Auth: none
- Response `200`: `{ "hello": "world" }`

### `GET /auth/nonce`

- Auth: none
- Query params:
  - `address` (required): EVM address, pattern `0x[a-fA-F0-9]{40}`
- Response `200`:

```json
{ "nonce": "<hex nonce>" }
```

- Notes:
  - Address is normalized to lowercase before nonce storage.
  - Route-level rate limit uses `NONCE_RATE_LIMIT_MAX` and `NONCE_RATE_LIMIT_WINDOW_MS`.

### `POST /auth/verify`

- Auth: none
- Body:

```json
{
  "message": "<SIWE message>",
  "signature": "0x..."
}
```

- Validation:
  - `message`: string, 20-4096 chars
  - `signature`: 132 chars, pattern `^0x[a-fA-F0-9]{130}$`
- Response `200`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<refresh-token>"
}
```

- Common errors:
  - `400 { "error": "Invalid domain" }` when SIWE domain mismatches `ALLOWED_DOMAIN`
  - `400 { "error": "Invalid chain" }` when `CHAIN_ID` is set and does not match
  - `400 { "error": "Invalid nonce" }` when nonce is missing/consumed/mismatched
  - `401 { "error": "Authentication failed" }` when SIWE message/signature verification fails
- Notes:
  - Route-level rate limit uses `VERIFY_RATE_LIMIT_MAX` and `VERIFY_RATE_LIMIT_WINDOW_MS`.

### `POST /auth/refresh`

- Auth: none
- Body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

- Validation:
  - `refreshToken`: string, 16-2048 chars
- Response `200`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<new-refresh-token>"
}
```

- Common errors:
  - `401 { "error": "Invalid refresh token" }`
  - `500 { "error": "Unable to refresh token at this time" }`
- Notes:
  - Route-level rate limit uses `REFRESH_RATE_LIMIT_MAX` and `REFRESH_RATE_LIMIT_WINDOW_MS`.

### `GET /auth/me`

- Auth: `Authorization: Bearer <accessToken>`
- Guard behavior:
  - JWT must be valid
  - Session must still be active (not revoked/expired)
- Response `200`:

```json
{
  "address": "0x...",
  "ensName": "alice.eth",
  "firstSeen": "2026-01-01T00:00:00.000Z",
  "sessionCount": 3
}
```

- Common errors:
  - `401 { "error": "Missing token" }`
  - `401 { "error": "Invalid token" }`

### `DELETE /auth/logout`

- Auth: `Authorization: Bearer <accessToken>`
- Guard behavior:
  - JWT must be valid
  - Session must still be active
- Response `200`:

```json
{ "success": true }
```

- Common errors:
  - `401 { "error": "Missing token" }`
  - `401 { "error": "Invalid token" }`

### Global behavior

- Global rate limit is enabled via:
  - `RATE_LIMIT_MAX`
  - `RATE_LIMIT_WINDOW_MS`
- Request body size is limited by `BODY_LIMIT_BYTES`.

## Build

```bash
npm run build
```

This emits ESM, CommonJS, and declaration files in `dist/`.
