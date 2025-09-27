import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth",
        permanent: true,
      },
      {
        source: "/signup",
        destination: "/auth?tab=signup",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
