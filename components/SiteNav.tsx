"use client";

import Link from "next/link";

export function SiteNav({ current }: { current: "marlin" | "part450" }) {
  return (
    <nav className="site-nav" aria-label="STRIDE modules">
      <Link href="/" className="site-nav-brand">
        STRIDE
      </Link>
      <Link href="/" className={current === "marlin" ? "is-active" : ""}>
        Marlin
      </Link>
      <Link href="/part450" className={current === "part450" ? "is-active" : ""}>
        Part 450
      </Link>
    </nav>
  );
}
