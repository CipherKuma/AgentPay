import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence the webpack config warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'got' module on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        got: false,
      };
    }
    return config;
  },
};

export default nextConfig;
