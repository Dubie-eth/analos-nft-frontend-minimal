import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@solana/web3.js'],
  outputFileTracingRoot: __dirname,
  
  // Ensure proper webpack configuration for Railway
  webpack: (config, { isServer }) => {
    // Fix for Railway build issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    // Silence optional peer dependency warnings from pino by aliasing to false
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false as unknown as string,
      'sonic-boom': false as unknown as string,
    }
    return config
  },
  images: {
    domains: ['gateway.pinata.cloud', 'ipfs.io', 'cloudflare-ipfs.com'],
  },
  // SECURITY: Remove client-exposed environment variables
  // Backend calls now route through secure server-side proxy
  env: {
    // Only expose non-sensitive public environment variables
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  },
  // SECURITY: Enhanced security headers
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://solana.com https://cdn.skypack.dev https://vercel.live https://backpack.app https://phantom.app https://solflare.com https://*.walletconnect.com https://*.walletlink.org https://onlyanal.fun",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://rpc.analos.io https://api.analos.io https://*.supabase.co https://api.pinata.cloud https://gateway.pinata.cloud https://backpack.app https://phantom.app https://solflare.com https://api.helius.xyz https://explorer.solana.com https://*.walletconnect.com https://*.walletlink.org https://*.solana.com https://onlyanal.fun wss: ws:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self' https://vercel.live https://backpack.app https://phantom.app https://solflare.com https://*.walletconnect.com https://*.walletlink.org",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
      // Force cache refresh for IDL files
      {
        source: '/src/idl/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
