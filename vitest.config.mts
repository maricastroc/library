import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      SUBTEXT_DB: ":memory:",
      SESSION_SECRET: "test-secret-with-more-than-24-characters",
      ADMIN_PASSWORD: "test-password",
    },
  },
});
