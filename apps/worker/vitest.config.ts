import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    alias: {
      "@auction/shared": new URL("../../packages/shared/index.ts", import.meta.url).pathname,
    },
  },
});
