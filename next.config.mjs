/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy for the app's real dependencies:
//  - Firebase App Check + reCAPTCHA Enterprise load/execute from google/gstatic
//    and call the *.googleapis.com App Check endpoints (connect-src).
//  - Marketplace blueprint/thumbnail images are public objects on storage.googleapis.com.
//  - Next.js hydration + Tailwind need inline scripts/styles (no nonce pipeline here),
//    and reCAPTCHA historically needs 'unsafe-eval'.
//
// Shipped as Content-Security-Policy-REPORT-ONLY on purpose: App Check enforcement
// is live, so a single wrong origin in an *enforced* connect-src would 403 every
// authed route and lock users out. Report-Only reports violations to the browser
// console without blocking, so this can be validated against the live reCAPTCHA/App
// Check flow first. Once the console is clean on the production domain, rename the
// header key below to "Content-Security-Policy" to enforce it. Clickjacking is
// already enforced independently via X-Frame-Options: DENY, so nothing is left
// unprotected in the meantime.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://storage.googleapis.com https://www.gstatic.com https://www.google.com",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
  "connect-src 'self' https://firebaseappcheck.googleapis.com https://content-firebaseappcheck.googleapis.com https://firebaseinstallations.googleapis.com https://www.google.com https://www.gstatic.com",
  "frame-src https://www.google.com",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  // Clickjacking: enforced (well-supported), independent of the CSP rollout above.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Also shrinks the Referer sent to public Storage URLs, so an object URL is less
  // likely to leak via the header when a download/image is fetched cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
