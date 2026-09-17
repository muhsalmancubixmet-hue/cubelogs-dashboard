import withPWAInit from "@ducanh2912/next-pwa";
import os from "os";

function getAllowedDevOrigins() {
  const origins = new Set(["localhost", "127.0.0.1", "192.168.220.52", "192.168.220.36", "192.168.220.39"]);
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          origins.add(net.address);
        }
      }
    }
  } catch (e) {
    // Fallback if OS network interface call fails
  }
  return Array.from(origins);
}

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  /* config options here */
  allowedDevOrigins: getAllowedDevOrigins(),
  async rewrites() {
    const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const backendUrl = rawUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/$/, '') || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

export default process.env.NODE_ENV === "development" ? nextConfig : withPWA(nextConfig);

