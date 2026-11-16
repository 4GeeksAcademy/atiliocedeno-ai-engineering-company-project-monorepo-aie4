import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");
const config: NextConfig = {
  turbopack: { root: monorepoRoot },
  outputFileTracingRoot: monorepoRoot,
  async redirects() {
    return [
      {source:"/backoffice/index.html",destination:"/backoffice",permanent:true},
    ];
  },
};
export default config;
