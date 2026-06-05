import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typedRoutes: true,
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
}

export default nextConfig
