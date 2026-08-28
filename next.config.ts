import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["firebase-admin", "google-auth-library"],
  async redirects() {
    return [
      {
        source: "/admin/content/milestone",
        destination: "/admin/child-growth",
        permanent: false,
      },
      {
        source: "/admin/content/milestone/:path*",
        destination: "/admin/child-growth/:path*",
        permanent: false,
      },
      {
        source: "/admin/followup-visits",
        destination: "/admin/child-growth/follow-up",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
