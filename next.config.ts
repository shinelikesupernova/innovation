import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS === "true" ? "/innovation" : "",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["*.e2b.app", "3000-i54xth1ndzkmewr07uj1u.e2b.app"],
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
