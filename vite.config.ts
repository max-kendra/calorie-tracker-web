import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) }],
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
        rewrite: (urlPath) => urlPath.replace(/^\/api/, ""),
      },
      "/media": {
        target: process.env.VITE_DEV_API_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
