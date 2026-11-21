import type { Metadata } from "next";
import "./globals.css";
import { RESEARCH_TITLE, RESEARCH_INSTITUTION } from "@/lib/research";

export const metadata: Metadata = {
  title: RESEARCH_TITLE,
  applicationName: RESEARCH_TITLE,
  description: `${RESEARCH_TITLE}. ${RESEARCH_INSTITUTION} research demonstration: compare satellite imagery, inspect uncertainty, prioritize response zones, and export field reports.`,
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
