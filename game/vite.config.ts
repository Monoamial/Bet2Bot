import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { bundleEngine, pokerDir } from "./scripts/bundle_engine.mjs";

// Re-bundle the Python engine and full-reload the page whenever a poker/*.py file
// changes, so editing the engine hot-updates the Pyodide worker in dev.
function pokerEngineWatcher(): Plugin {
  return {
    name: "poker-engine-watcher",
    configureServer(server) {
      server.watcher.add(pokerDir);
      const onChange = (file: string) => {
        if (file.startsWith(pokerDir) && file.endsWith(".py")) {
          bundleEngine();
          server.config.logger.info(`[engine] re-bundled (${file.split("/").pop()})`);
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}

export default defineConfig({
  plugins: [react(), pokerEngineWatcher()],
  worker: {
    format: "es",
  },
  server: {
    port: 5173,
  },
});
