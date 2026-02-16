import { EventMessageSchema, type EventMessage } from '@0x0-gen/contracts';

export type GatewayHealth = {
  status: 'ok';
  service: 'gateway';
  uptime: number;
};

export type GatewayClient = {
  healthz: () => Promise<GatewayHealth>;
  connectEvents: (handlers: {
    onMessage: (event: EventMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
  }) => WebSocket;
};

export const createGatewayClient = (baseUrl: string): GatewayClient => {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  return {
    async healthz() {
      const response = await fetch(`${normalizedBaseUrl}/healthz`);
      if (!response.ok) {
        throw new Error(`Gateway health check failed with status ${response.status}`);
      }

      return (await response.json()) as GatewayHealth;
    },
    connectEvents({ onMessage, onOpen, onClose, onError }) {
      const wsUrl = normalizedBaseUrl.replace('http', 'ws');
      const socket = new WebSocket(`${wsUrl}/events`);

      socket.addEventListener('message', (messageEvent) => {
        try {
          const parsed = JSON.parse(String(messageEvent.data));
          const event = EventMessageSchema.parse(parsed);
          onMessage(event);
        } catch {
          // ignore malformed payloads
        }
      });

      if (onOpen) socket.addEventListener('open', onOpen);
      if (onClose) socket.addEventListener('close', onClose);
      if (onError) socket.addEventListener('error', onError);

      return socket;
    },
  };
};
