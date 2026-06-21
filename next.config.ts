import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
