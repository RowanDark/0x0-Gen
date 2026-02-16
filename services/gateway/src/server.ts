import { buildGateway } from './app.js';
import { createLogger } from '@0x0-gen/logger';

const logger = createLogger('gateway-bootstrap');
const port = Number(process.env.PORT ?? '4000');
const host = process.env.HOST ?? '0.0.0.0';

const bootstrap = async () => {
  const app = await buildGateway();

  try {
    await app.listen({ port, host });
    logger.info('Gateway listening', { host, port });
  } catch (error) {
    logger.error('Gateway failed to start', { error: String(error) });
    process.exit(1);
  }
};

void bootstrap();
