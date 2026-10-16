"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/", icon: "grid" },
  { label: "Chat playground", href: "/chat", icon: "chat" },
  { label: "Security findings", href: "/findings", icon: "shield" },
  { label: "Threat signals", href: "/threats", icon: "pulse" },
  { label: "Audit trail", href: "/audit", icon: "list" },
  { label: "Evaluation lab", href: "/evaluations", icon: "flask" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5a7.5 7.5 0 0 1 15 0Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
    pulse: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M8 15h8"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = navigation.find((item) => item.href === pathname) ?? navigation[0];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)}>
        <span className="sr-only">{menuOpen ? "Close navigation" : "Open navigation"}</span>
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
      </button>
      <aside id="primary-navigation" className={`sidebar ${menuOpen ? "sidebar-open" : ""}`} aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="AegisGate home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 2.8 28 7v8.1c0 7.2-5 12.3-12 14.1C9 27.4 4 22.3 4 15.1V7l12-4.2Z"/><path d="m11.2 15.8 3.1 3.1 6.7-7"/></svg></span>
          <span className="brand-type"><strong>Aegis<span>Gate</span></strong><small>AI SECURITY GATEWAY</small></span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="nav-list">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.href === "/chat" && <span className="nav-indicator" aria-label="Live integration priority" />}
            </Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="environment-card"><span className="environment-icon"><Icon name="shield" /></span><span><strong>Security layer</strong><small>Local workspace</small></span><span className="status-dot" aria-label="Status unknown" /></div>
          <p className="sidebar-footnote">Access controls are not implemented.</p>
        </div>
      </aside>
      {menuOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{current.label}</strong></div>
          <div className="topbar-right"><span className="connection-status"><span className="status-dot status-dot-muted" />API connection not checked</span><span className="topbar-divider" /><span className="environment-label">LOCAL ENVIRONMENT</span></div>
        </header>
        <main id="main-content" className="main-content">{children}</main>
        <footer className="app-footer"><span>AegisGate <span className="footer-separator">·</span> Security workspace</span><span>Frontend foundation</span></footer>
      </div>
    </div>
  );
}
