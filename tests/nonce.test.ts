import { test, expect, vi } from 'vitest';
import { buildApp } from '../src/app';

test('GET /auth/nonce returns a 64-char hex nonce', async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: 'GET',
    url: '/auth/nonce?address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  });
  expect(res.statusCode).toBe(200);
  expect(res.json().nonce).toMatch(/^[a-f0-9]{64}$/);
  app.log.info({ nonce: res.json().nonce }, 'Received nonce');
  await app.close();
});