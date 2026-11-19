import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { isBrowserKey } from "./src/supabase-key.js";
import { createLocalChaoxingMiddleware } from "./server/local-chaoxing.mjs";

const publicPlatformVariables = [
  "CODER_SUPABASE_URL",
  "CODER_SUPABASE_ANON_KEY",
  "CODER_SUPABASE_TENANT_ID",
  "CODER_PROJECTS_ID",
  "CODER_AUTH_PROXY_URL",
];

export default defineConfig(({ mode, command, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "CODER_"]);
  for (const name of ["VITE_SUPABASE_PUBLISHABLE_KEY", "CODER_SUPABASE_ANON_KEY"]) {
    if (env[name] && !isBrowserKey(env[name].trim())) {
      throw new Error(`${name} must be a publishable or legacy anon key.`);
    }
  }
  const local = loadEnv(mode, process.cwd(), ["APP_PUBLIC_URL", "SSO_"]);
  const localLogin = command === "serve" && !isPreview
    && Boolean(local.APP_PUBLIC_URL && local.SSO_CENTER_URL && local.SSO_SHARED_SECRET);
  const plugins = [react()];
  if (localLogin) plugins.push({
    name: "metalwork-local-chaoxing",
    configureServer(server) {
      server.middlewares.use(createLocalChaoxingMiddleware({
        publicUrl: local.APP_PUBLIC_URL,
        centerUrl: local.SSO_CENTER_URL,
        sharedSecret: local.SSO_SHARED_SECRET,
      }));
    },
  });
  return {
    define: {
      ...Object.fromEntries(publicPlatformVariables.map(name => [
        `import.meta.env.${name}`, JSON.stringify(env[name] ?? ""),
      ])),
      "import.meta.env.LOCAL_CHAOXING_ENABLED": JSON.stringify(localLogin),
    },
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
    plugins,
  };
});
