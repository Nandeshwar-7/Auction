import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");

const allowedDevOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(process.env.NEXT_ALLOWED_DEV_ORIGINS
    ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(",").map((origin) => origin.trim())
    : []),
].filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
  transpilePackages: ["@auction/shared"],
  // Correct server trace roots in npm workspaces (fixes OpenNext / CF bundle resolution).
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
