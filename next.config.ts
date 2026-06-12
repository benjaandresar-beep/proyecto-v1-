import type { NextConfig } from "next";

// Exportación estática para GitHub Pages. El basePath se inyecta en CI
// (el sitio vive en https://<usuario>.github.io/proyecto-v1-/).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
