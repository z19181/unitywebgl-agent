/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Disable ESLint during build — v1.1.3 uses TypeScript for type safety.
  // Re-enable with a v9 flat config in v1.1.4.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
