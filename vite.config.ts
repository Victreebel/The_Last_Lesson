import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1800
  },
  server: {
    port: 5173
  }
});
