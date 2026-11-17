import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { isBrowserKey } from "./src/supabase-key.js";

export default defineConfig(({ mode }) => {
  const { VITE_SUPABASE_PUBLISHABLE_KEY: key } = loadEnv(mode, process.cwd());
  if (key && !isBrowserKey(key.trim())) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key.");
  }
  return {
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [react()],
  };
});
