import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  /* config options here */
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default process.env.NODE_ENV === "development" ? nextConfig : withPWA(nextConfig);
