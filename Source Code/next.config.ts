import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse', 'mammoth', 'pdfkit'],
  devIndicators: false,
};

export default nextConfig;
