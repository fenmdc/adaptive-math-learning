import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Adaptive Math Learning",
    short_name: "Adaptive Math",
    description: "Adaptive math practice, diagnostics, learning reports, and explainable recommendations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#115a8c",
    orientation: "portrait-primary",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Practice",
        short_name: "Practice",
        description: "Open adaptive practice",
        url: "/practice",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Diagnostic",
        short_name: "Diagnostic",
        description: "Start diagnostic mode",
        url: "/diagnostic",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open the learning report",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
