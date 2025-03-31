/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase the limit to 10MB
    },
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint during builds
  },
};

module.exports = nextConfig;
