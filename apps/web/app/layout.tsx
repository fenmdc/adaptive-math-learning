import type { ReactNode } from "react";
import PwaRegister from "./PwaRegister";
import "./globals.css";

export const metadata = {
  title: "Adaptive Math Learning",
  description: "Adaptive math practice, diagnostics, learning reports, and explainable recommendations.",
  applicationName: "Adaptive Math Learning",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adaptive Math"
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport = {
  themeColor: "#115a8c"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
