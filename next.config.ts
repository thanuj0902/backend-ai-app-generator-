import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["@upstash/redis"],
  async rewrites() {
    return [
      {
        source: "/preview/:projectId/:path*",
        destination: "/api/preview/:projectId/:path*",
      },
    ]
  },
}

export default nextConfig
