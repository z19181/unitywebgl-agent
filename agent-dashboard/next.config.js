/** @type {import('next').NextConfig} */
const nextConfig = {
  // v1.3.0 Phase C.1: switched to standard Next.js server with standalone output
  output: 'standalone',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
