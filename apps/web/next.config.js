/** @type {import('next').NextConfig} */
const nextConfig = {
  // packages/shared ships raw TypeScript; have Next transpile it instead of
  // requiring a separate build step for the workspace package.
  transpilePackages: ["@rr-kitchen/shared"],
};

module.exports = nextConfig;
