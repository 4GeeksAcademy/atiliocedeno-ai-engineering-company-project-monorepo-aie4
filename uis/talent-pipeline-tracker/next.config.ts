import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");
const config: NextConfig = {
  turbopack: { root: monorepoRoot },
  outputFileTracingRoot: monorepoRoot,
  async redirects() {
    return [
      {source:"/index.html",destination:"/",permanent:true},
      {source:"/index.en.html",destination:"/en",permanent:true},
      {source:"/aplication.html",destination:"/care-request",permanent:true},
      {source:"/aplication.en.html",destination:"/en/care-request",permanent:true},
    ];
  },
};
export default config;
