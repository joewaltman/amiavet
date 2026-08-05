/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma needs to be treated as an external in server components / route handlers.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@auth/prisma-adapter"],
  },
};

export default nextConfig;
