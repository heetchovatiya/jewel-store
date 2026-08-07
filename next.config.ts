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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Legacy DigitalOcean Spaces (existing product URLs during migration)
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
      // Cloudflare R2 custom CDN domain (fallback if NEXT_PUBLIC_CDN_URL unset at build)
      { protocol: 'https', hostname: 'cdn.priyancigold.com', pathname: '/**' },
      ...(cdnHostname && cdnHostname !== 'cdn.priyancigold.com'
        ? [{ protocol: 'https' as const, hostname: cdnHostname, pathname: '/**' }]
        : []),
    ],
  },
};

export default nextConfig;
