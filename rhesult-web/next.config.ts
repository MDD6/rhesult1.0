import type { NextConfig } from "next";

const BACKEND_URL = process.env.API_BASE || "http://localhost:4000";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || BACKEND_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    const connectSrc = [
      "'self'",
      "ws:",
      "wss:",
      BACKEND_URL,
      SOCKET_URL,
    ].filter(Boolean).join(" ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Allow backend-hosted avatars and static assets
              `img-src 'self' data: blob: https://images.unsplash.com ${BACKEND_URL}`,
              "media-src 'self' https://github.com https://objects.githubusercontent.com",
              `connect-src ${connectSrc}`,
            ].join("; "),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // fallback rewrites run AFTER all filesystem routes (including dynamic
      // catch-all App Router handlers like [...path] and [id]).  This ensures
      // that API route handlers defined in src/app/api/ take priority and only
      // unmatched /api/* requests are forwarded to the Express backend.
      fallback: [
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
