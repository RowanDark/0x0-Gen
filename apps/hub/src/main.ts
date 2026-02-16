import { createGatewayClient } from '@0x0-gen/sdk';
import { runtimeName } from '@0x0-gen/ui';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Hub root element was not found.');
}

const gatewayUrl = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:4000';
const client = createGatewayClient(gatewayUrl);

app.innerHTML = `
  <main style="font-family: Arial, sans-serif; max-width: 720px; margin: 2rem auto; line-height: 1.4;">
    <h1>${runtimeName} Hub</h1>
    <p><strong>Gateway URL:</strong> ${gatewayUrl}</p>
    <p><strong>Health status:</strong> <span id="health-status">checking...</span></p>
    <p><strong>WebSocket status:</strong> <span id="ws-status">connecting...</span></p>
    <p><strong>Last event:</strong> <span id="last-event">none</span></p>
  </main>
`;

const healthStatus = document.querySelector<HTMLSpanElement>('#health-status');
const wsStatus = document.querySelector<HTMLSpanElement>('#ws-status');
const lastEvent = document.querySelector<HTMLSpanElement>('#last-event');

const updateText = (el: HTMLElement | null, text: string) => {
  if (el) {
    el.textContent = text;
  }
};

client
  .healthz()
  .then((health) => {
    updateText(healthStatus, `${health.status} (uptime ${Math.floor(health.uptime)}s)`);
  })
  .catch((error) => {
    updateText(healthStatus, `error: ${String(error)}`);
  });

client.connectEvents({
  onOpen: () => updateText(wsStatus, 'connected'),
  onClose: () => updateText(wsStatus, 'disconnected'),
  onError: () => updateText(wsStatus, 'error'),
  onMessage: (event) => {
    updateText(lastEvent, `${event.type} @ ${event.timestamp}`);
  },
});
