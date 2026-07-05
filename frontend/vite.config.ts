import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const devPort = Number.parseInt(process.env.VITE_DEV_PORT ?? "5173", 10);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number.isNaN(devPort) ? 5173 : devPort,
  },
});
