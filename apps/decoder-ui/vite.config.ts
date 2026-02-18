import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    proxy: {
      "/decoder": "http://localhost:3100",
      "/ws": {
        target: "ws://localhost:3100",
        ws: true,
      },
      "/healthz": "http://localhost:3100",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
  },
});
