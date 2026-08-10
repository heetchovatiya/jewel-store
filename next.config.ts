import type { NextConfig } from "next";

const cdnHostname = (() => {
  const raw = process.env.NEXT_PUBLIC_CDN_URL || '';
  try {
    if (raw) return new URL(raw).hostname;
  } catch {
    /* ignore */
  }
  return null;
})();

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // NOTE: COOP same-origin blocks bfcache — omit on HTML for storefront.
];

const longCache = [
  {
    key: 'Cache-Control',
    value: 'public, max-age=31536000, immutable',
  },
];

const nextConfig: NextConfig = {
  // Source maps inflate download size; upload privately via Sentry if needed.
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days for optimized images
    deviceSizes: [640, 750, 828, 1080, 1200, 1600],
    imageSizes: [64, 96, 128, 256, 384, 600],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jewelstore.sgp1.digitaloceanspaces.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'jewel-store.sgp1.digitaloceanspaces.com',
        pathname: '/**',
      },
      { protocol: 'https', hostname: 'cdn.priyancigold.com', pathname: '/**' },
      ...(cdnHostname && cdnHostname !== 'cdn.priyancigold.com'
        ? [{ protocol: 'https' as const, hostname: cdnHostname, pathname: '/**' }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: longCache,
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.(ico|png|jpg|jpeg|webp|avif|svg|woff|woff2)',
        headers: longCache,
      },
    ];
  },
};

export default nextConfig;
