import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    esmExternals: 'loose',
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.externals.push({
      '@clerk/shared': 'commonjs @clerk/shared',
      '@clerk/nextjs': 'commonjs @clerk/nextjs'
    });
    return config;
  }
};

export default nextConfig;