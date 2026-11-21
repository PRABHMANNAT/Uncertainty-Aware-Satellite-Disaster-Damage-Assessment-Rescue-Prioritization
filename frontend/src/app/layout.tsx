import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DisasterIQ — Satellite Disaster-Damage Triage",
  description:
    "Satellite damage assessment for disaster response. Compare imagery, prioritize response zones, and export field reports.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
