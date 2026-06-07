import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Adaptive Math Learning",
  description: "Adaptive math learning MVP dashboard"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
