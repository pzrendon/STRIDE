"use client";

import Link from "next/link";

// The Next.js prototype now only hosts Marlin. The Part 450 workbook and the
// Sea Turtle predictor live on the static site (web/, deployed to GitHub Pages),
// which is the single source of truth for those tools.
export function SiteNav({ current = "marlin" }: { current?: "marlin" }) {
  return (
    <nav className="site-nav" aria-label="STRIDE modules">
      <Link href="/" className="site-nav-brand">
        STRIDE
      </Link>
      <Link href="/" className={current === "marlin" ? "is-active" : ""}>
        Marlin
      </Link>
    </nav>
  );
}
