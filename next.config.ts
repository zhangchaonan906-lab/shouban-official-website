import type { NextConfig } from "next";

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0"
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/contact", headers: noStoreHeaders },
      { source: "/privacy", headers: noStoreHeaders },
      { source: "/api/contact", headers: noStoreHeaders }
    ];
  }
};

export default nextConfig;
