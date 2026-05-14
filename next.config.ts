import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.prod.by433.com",
        pathname: "/media/logos/**",
      },
    ],
  },
};

export default nextConfig;
