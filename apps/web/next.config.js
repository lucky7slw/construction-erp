/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hhhomespm/ui'],
  eslint: {
    ignoreDuringBuilds: true // Temporarily disable ESLint during build
  },
  typescript: {
    ignoreBuildErrors: false
  },
  experimental: {
    // typedRoutes: true // Temporarily disabled during development
  }
};

module.exports = nextConfig;