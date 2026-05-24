/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // For /runtime-gate and /rag-query results
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
