import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    // netlify/** is included so the sync-linker tests added by plan 002
    // are picked up without touching this config again; scripts/** covers the
    // seed helpers (e.g. the knockout official-number mapping).
    include: [
      "src/**/*.test.{ts,tsx}",
      "netlify/**/*.test.{ts,mts}",
      "scripts/**/*.test.ts",
    ],
  },
})
