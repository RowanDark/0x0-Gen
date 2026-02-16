import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import { buildGateway } from '../src/app.js';

let address: AddressInfo;
const appPromise = buildGateway();

beforeAll(async () => {
  const app = await appPromise;
  await app.listen({ host: '127.0.0.1', port: 0 });
  address = app.server.address() as AddressInfo;
});

afterAll(async () => {
  const app = await appPromise;
  await app.close();
});

describe('gateway health endpoint', () => {
  it('returns healthy status', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', service: 'gateway' });
  });
});

describe('gateway websocket events', () => {
  it('accepts websocket clients and emits a startup event', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${address.port}/events`);

    const event = await new Promise<Record<string, unknown>>((resolve, reject) => {
      ws.on('message', (data) => {
        ws.close();
        resolve(JSON.parse(data.toString()));
      });
      ws.on('error', reject);
    });

    expect(event.type).toBe('gateway.connected');
  });
});
