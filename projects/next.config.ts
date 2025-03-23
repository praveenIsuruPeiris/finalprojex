import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    esmExternals: 'loose',
    serverActions: {
      bodySizeLimit: '10mb', // Increase the limit to 10MB
    },
    
  },
  webpack: (config) => {
    config.externals.push({
      '@clerk/shared': 'commonjs @clerk/shared',
      '@clerk/nextjs': 'commonjs @clerk/nextjs'
    });
    return config;
};
}
export default nextConfig;
