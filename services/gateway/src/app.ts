import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { EventMessageSchema } from '@0x0-gen/contracts';
import { createLogger } from '@0x0-gen/logger';

const logger = createLogger('gateway');

export const buildGateway = async (): Promise<FastifyInstance> => {
  const app = Fastify();

  await app.register(websocket);

  app.get('/healthz', async () => ({
    status: 'ok' as const,
    service: 'gateway' as const,
    uptime: process.uptime(),
  }));

  app.get('/events', { websocket: true }, (socket) => {
    const bootEvent = EventMessageSchema.parse({
      type: 'gateway.connected',
      timestamp: new Date().toISOString(),
      payload: { source: 'gateway' },
    });

    socket.send(JSON.stringify(bootEvent));

    const heartbeat = setInterval(() => {
      const event = EventMessageSchema.parse({
        type: 'gateway.heartbeat',
        timestamp: new Date().toISOString(),
        payload: { uptime: process.uptime() },
      });

      socket.send(JSON.stringify(event));
    }, 5_000);

    socket.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  app.all('/services/:service/*', async (request, reply) => {
    logger.info('Stub service route hit', { route: request.url, service: request.params });

    return reply.code(501).send({
      status: 'not_implemented',
      message: 'Service routing is part of a future milestone.',
    });
  });

  return app;
};
