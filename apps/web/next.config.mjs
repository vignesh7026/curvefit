/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  transpilePackages: ["@curvefit/shared"],
  images: { remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }] },
  poweredByHeader: false,
  // The API sets SameSite=Strict login cookies, so the browser must see it on the storefront's own
  // origin. When API_PROXY_TARGET is set (e.g. https://curvefit-api.onrender.com), /api/* is proxied
  // there, and NEXT_PUBLIC_API_URL should be <storefront url>/api. Local routes such as
  // /api/checkout still win because filesystem routes are matched before these rewrites.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
    return target ? [{ source: "/api/:path*", destination: `${target}/api/:path*` }] : [];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
