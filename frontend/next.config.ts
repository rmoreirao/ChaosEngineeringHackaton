import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  async rewrites() {
    return {
      afterFiles: [
        { source: '/api/auth/:path*', destination: `${backendUrl}/api/auth/:path*` },
        { source: '/api/products/:path*', destination: `${backendUrl}/api/products/:path*` },
        { source: '/api/categories/:path*', destination: `${backendUrl}/api/categories/:path*` },
        { source: '/api/orders/:path*', destination: `${backendUrl}/api/orders/:path*` },
        { source: '/api/health', destination: `${backendUrl}/api/health` },
      ],
    };
  },
};

export default nextConfig;
