import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracing: {
    ignore: [],
  },
  reactStrictMode: true,
};

export default nextConfig;
