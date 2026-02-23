import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Workspace packages — resolve to TS source (no pre-build required)
      {
        find: "@teamteamteam/api-client/web",
        replacement: path.resolve(__dirname, "../../packages/api-client/src/web.ts"),
      },
      {
        find: "@teamteamteam/api-client",
        replacement: path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
      },
      {
        find: "@teamteamteam/domain",
        replacement: path.resolve(__dirname, "../../packages/domain/src/index.ts"),
      },
    ],
  },
});
