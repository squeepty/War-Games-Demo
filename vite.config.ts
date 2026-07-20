import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this project below /War-Games-Demo/.  The release
  // archive instead needs relative paths so it works from any static server.
  base: mode === "release" ? "./" : "/War-Games-Demo/",
}));
