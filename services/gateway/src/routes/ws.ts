import type { FastifyInstance } from "fastify";
import { addClient } from "../broadcaster.js";

export async function wsRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket) => {
    addClient(socket);
  });
}
