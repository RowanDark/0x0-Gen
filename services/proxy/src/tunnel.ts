import net from "node:net";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { createLogger } from "@0x0-gen/logger";

const logger = createLogger("proxy:tunnel");

export function handleConnect(
  req: IncomingMessage,
  clientSocket: Duplex,
  head: Buffer,
): void {
  const target = req.url ?? "";
  const [host, portStr] = target.split(":");
  const port = parseInt(portStr, 10) || 443;

  logger.debug(`CONNECT tunnel to ${host}:${port}`);

  const serverSocket = net.connect(port, host, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", (err) => {
    logger.error(`Tunnel error to ${host}:${port}`, { error: err.message });
    clientSocket.end();
  });

  clientSocket.on("error", (err) => {
    logger.error(`Client socket error for ${host}:${port}`, { error: err.message });
    serverSocket.end();
  });

  serverSocket.on("end", () => {
    clientSocket.end();
  });

  clientSocket.on("end", () => {
    serverSocket.end();
  });
}
