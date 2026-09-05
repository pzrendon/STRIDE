import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "STRIDE | Marlin and Part 450",
  description:
    "Conceptual STRIDE toolkit for hypersonic mission design (Marlin) and Part 450-oriented mission safety workbooks."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
