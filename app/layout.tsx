import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marlin | Hypersonic Mission Playground",
  description:
    "A conceptual STRIDE prototype for comparing rocket-boosted hypersonic re-entry vehicle mission profiles."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
