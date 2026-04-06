# fastify-siwe-middleware

Fastify middleware helpers for SIWE-based auth flows.

Use this project as a dedicated auth microservice that can be shared by multiple frontends and/or APIs.

- The auth service owns SIWE verification, session issuance, refresh rotation, and logout.
- Your application services trust only the returned access token and do not re-implement wallet-signature verification.
- The token issuer (`JWT_SECRET`, `ALLOWED_DOMAIN`, optional `CHAIN_ID`) is centralized in one place.

**[Live Demo](https://fastify-siwe-middleware-front-demo.antoine.sh)**

## Self-host

This project can be run as a standalone auth service. The application listens on port `3000`, runs migrations on startup, and requires PostgreSQL and Redis.

Release builds are published as GitHub Container Registry images on each release. Use the release tag you want to pin to, or `latest` if you intentionally want the most recent release.

### Docker image

```bash
docker pull ghcr.io/ajeanselme/fastify-siwe-middleware:latest
```

### Required environment variables

The service requires these environment variables at startup:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`
- `REDIS_HOST`
- `JWT_SECRET`
- `ALLOWED_DOMAIN`

Optional variables:

- `DB_SCHEMA`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_DATABASE`
- `CHAIN_ID`
- `RPC_URL`
- `HOST` (default: `0.0.0.0`)
- `BODY_LIMIT_BYTES`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_MS`
- `NONCE_RATE_LIMIT_MAX`
- `NONCE_RATE_LIMIT_WINDOW_MS`
- `VERIFY_RATE_LIMIT_MAX`
- `VERIFY_RATE_LIMIT_WINDOW_MS`
- `REFRESH_RATE_LIMIT_MAX`
- `REFRESH_RATE_LIMIT_WINDOW_MS`
- `REFRESH_TOKEN_TTL_SECONDS`

### [Example compose setup](docker-compose.yml)

### Run as a complete reusable SIWE auth service

Use this project as a dedicated auth microservice that can be shared by multiple frontends and/or APIs.

- The auth service owns SIWE verification, session issuance, refresh rotation, and logout.
- Your application services trust only the returned access token and do not re-implement wallet-signature verification.
- The token issuer (`JWT_SECRET`, `ALLOWED_DOMAIN`, optional `CHAIN_ID`) is centralized in one place.

#### Quick start (Docker Compose)

1. Create a `.env` file in the project root:

```bash
DB_HOST=postgres
DB_PORT=5432
DB_USER=siwe
DB_PASSWORD=secret
DB_DATABASE=siwe_auth
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=replace-with-a-long-random-secret
ALLOWED_DOMAIN=localhost:3000
CHAIN_ID=1
```

2. Start the full stack:

```bash
docker compose up -d
```

3. Verify the service:

```bash
curl http://localhost:3000/
curl http://localhost:3000/docs/json
```

The app container automatically runs DB migrations on startup.

#### Quick start (run from source)

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL and Redis (for example with `docker compose up -d postgres redis`).

3. Use the same `.env` variables as above, then start the server:

```bash
npm run start
```

For local development with auto-reload, use:

```bash
npm run dev
```

#### Reuse pattern for external applications

Treat this service as your auth boundary and integrate with a standard token lifecycle:

1. Frontend calls `GET /auth/nonce?address=0x...`.
2. Frontend builds and signs a SIWE message with the nonce.
3. Frontend calls `POST /auth/verify` with `{ message, signature }`.
4. Frontend stores `accessToken` and `refreshToken` securely.
5. Frontend sends `Authorization: Bearer <accessToken>` to protected backends.
6. On `401` or access-token expiry, frontend calls `POST /auth/refresh`.
7. On sign-out, frontend calls `DELETE /auth/logout` and clears local tokens.

#### Backend integration contract

Any API behind this auth service should:

- Validate JWTs with the same `JWT_SECRET`.
- Trust only server-issued claims, not wallet data sent directly by clients.
- Optionally check active session state (recommended for immediate logout/revocation effects).

#### Production hardening checklist

- Use strong random secrets for `JWT_SECRET` and rotate them with a planned rollout.
- Pin a specific container image tag instead of `latest`.
- Put the service behind HTTPS and restrict CORS at your gateway.
- Configure rate limits (`RATE_LIMIT_*`, `NONCE_RATE_LIMIT_*`, `VERIFY_RATE_LIMIT_*`, `REFRESH_RATE_LIMIT_*`) for expected traffic.
- Use managed PostgreSQL/Redis with backups and monitoring.
- Export and monitor logs/metrics for nonce, verify, refresh, and logout events.

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
