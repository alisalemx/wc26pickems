import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    // scripts/** covers the seed helpers (e.g. the knockout official-number
    // mapping).
    include: [
      "src/**/*.test.{ts,tsx}",
      "scripts/**/*.test.ts",
    ],
  },
})
