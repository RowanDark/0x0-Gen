import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/healthz": "http://localhost:3100",
      "/ws": {
        target: "ws://localhost:3100",
        ws: true,
      },
      "/services": "http://localhost:3100",
      "/projects": "http://localhost:3100",
      "/events": "http://localhost:3100",
      "/hub": "http://localhost:3100",
    },
  },
});
