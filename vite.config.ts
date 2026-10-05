import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function generatorRoute(): Plugin {
  let isBuild = false;
  const rewriteGeneratorRequest = (request: { url?: string }) => {
    if (!request.url) return;
    const [pathname, query] = request.url.split("?", 2);
    if (pathname === "/generator") {
      request.url = `/GeneratorCodeshop.html${query ? `?${query}` : ""}`;
    }
  };

  return {
    name: "generator-route",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        rewriteGeneratorRequest(request);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        rewriteGeneratorRequest(request);
        next();
      });
    },
    closeBundle() {
      if (isBuild) {
        copyFileSync(
          resolve(process.cwd(), "GeneratorCodeshop.html"),
          resolve(process.cwd(), "dist", "GeneratorCodeshop.html"),
        );
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generatorRoute()],
});
