/** @type {import('next').NextConfig} */
const nextConfig = {
  // packages/shared ships raw TypeScript; have Next transpile it instead of
  // requiring a separate build step for the workspace package.
  transpilePackages: ["@rr-kitchen/shared"],
  images: {
    // Uploaded menu/combo photos are served from the API host, which
    // differs by environment (localhost / LAN IP in dev, a separate Render
    // domain in production) and isn't known at build time — so there's no
    // fixed hostname to whitelist via remotePatterns. Optimization isn't
    // worth the added config for this app's traffic, so serve the
    // originals as-is.
    unoptimized: true,
  },
};

module.exports = nextConfig;
