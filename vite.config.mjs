// vite.config.mjs

import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isElectron = process.env.ELECTRON === 'true';

  return {
    server: {
      port: 3000,
      // --- 👇 THIS IS THE REQUIRED ADDITION ---
      // This explicitly tells the live-reload client how to connect to the Vite server.
      // It's essential for making live-reloading work inside Electron.
      hmr: {
        host: 'localhost',
        protocol: 'ws',
      },
        watch: {
        usePolling: true,
      }
    },
    // This part is already correct and very well done!
    base: isElectron ? './' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: 'dist',
    }
  };
});