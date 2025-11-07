import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// HeartLink Provider Platform — Vite Config
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
