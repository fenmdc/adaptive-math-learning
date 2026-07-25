import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Learning workspace", short: "Learn" },
  { href: "/dashboard", label: "Progress dashboard", short: "Progress" },
];

function ProductMark() {
  return (
    <span className="product-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <path d="M6 22 13 8l5 10 3-6 5 10" />
        <circle cx="13" cy="8" r="2" />
        <circle cx="18" cy="18" r="2" />
        <circle cx="21" cy="12" r="2" />
      </svg>
    </span>
  );
}

export default function AppShell({
  activeRoute,
  children,
}: {
  activeRoute: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="side-rail">
        <Link className="product-lockup" href="/">
          <ProductMark />
          <span>
            <strong>Adaptive Math</strong>
            <small>Learning workspace</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link
              aria-current={activeRoute === item.href ? "page" : undefined}
              className={activeRoute === item.href ? "is-active" : ""}
              href={item.href}
              key={item.href}
            >
              <span>{item.short}</span>
              <strong>{item.label}</strong>
            </Link>
          ))}
        </nav>

        <div className="rail-note">
          <span className="status-dot" />
          <p>
            <strong>MVP boundary</strong>
            Pre-Algebra, Algebra 1, and AMC8 reasoning.
          </p>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
