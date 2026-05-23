import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  serverExternalPackages: ["@trigger.dev/sdk"],
  images: {
    remotePatterns: (() => {
      const patterns = [
        {
          protocol: "https" as const,
          hostname: "image.tmdb.org",
          port: "",
          pathname: "/t/p/**",
        },
        {
          protocol: "https" as const,
          hostname: "resizing.flixster.com",
          port: "",
          pathname: "/**",
        },
      ];

      // Dynamically add R2 domains if configured
      const addPatternFromUrl = (urlStr: string | undefined) => {
        if (!urlStr) return;
        try {
          const url = new URL(urlStr);
          patterns.push({
            protocol: url.protocol.replace(":", "") as "https",
            hostname: url.hostname,
            port: url.port,
            pathname: "/**",
          });
        } catch {
          // Ignore invalid URLs
        }
      };

      addPatternFromUrl(process.env.R2_PUBLIC_BASE_URL);
      addPatternFromUrl(process.env.R2_ENDPOINT);

      return patterns;
    })(),
  },
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
