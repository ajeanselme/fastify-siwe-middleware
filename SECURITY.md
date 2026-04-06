# Threat model

## Nonce replay
Mitigated by Redis GETDEL — nonces are single-use and expire in 5 minutes.

## Phishing / cross-domain
Mitigated by SIWE domain binding validated server-side.

## Chain spoofing
Mitigated by enforcing a single allowed chainId in config.

## Token theft
Short-lived access tokens (15 min). Refresh tokens stored as hashes.
Logout revokes the session immediately via Postgres.

## Nonce farming
Rate limiting on /auth/nonce: 10 req/min per IP.