import type { NextConfig } from "next";

const desktop = process.env.TEXTILENLACE_DESKTOP === "1";

const nextConfig: NextConfig = {
  ...(desktop
    ? {
        output: "standalone" as const,
        outputFileTracingIncludes: {
          "/*": ["node_modules/.prisma/client/**/*", "node_modules/@prisma/client/**/*"],
        },
      }
    : {}),
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
