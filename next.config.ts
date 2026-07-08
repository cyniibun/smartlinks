import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://analytics.tiktok.com https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://analytics.tiktok.com https://www.google-analytics.com https://region1.google-analytics.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net",
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), gyroscope=(), magnetometer=(), accelerometer=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  allowedDevOrigins: ["172.20.23.144"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
