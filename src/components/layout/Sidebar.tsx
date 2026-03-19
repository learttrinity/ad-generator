"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";

// ─── Icons ─────────────────────────────────────────────────────────────────────

const IconBolt = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M9 7h1m-1 4h1m4-4h1m-1 4h1M9 15h6" />
  </svg>
);

const IconClipboard = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const IconHistory = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconHome = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconCog = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconLogout = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// ─── Nav item ─────────────────────────────────────────────────────────────────

type NavItemDef = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  primary?: boolean;
};

function NavItem({ item, active }: { item: NavItemDef; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] font-medium transition-colors"
      style={{
        background: active ? (item.primary ? "#1e3a6e" : "#1C1C1C") : "transparent",
        color: active ? (item.primary ? "#93b8ff" : "#E8E8E6") : "#6A6A6A",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.color = "#C0C0BE";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.color = "#6A6A6A";
      }}
    >
      <span style={{ color: active ? (item.primary ? "#93b8ff" : "#A0B4FF") : "#4A4A4A" }}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const isActive = (href: string) =>
    pathname === href || (href !== "/uebersicht" && pathname.startsWith(href + "/"));

  const sectionLabel = (text: string) => (
    <p className="px-2 mb-1.5 mt-4 first:mt-0 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#3A3A3A" }}>
      {text}
    </p>
  );

  return (
    <aside
      className="sidebar-scroll w-[220px] shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto"
      style={{ background: "#0A0A0A", borderRight: "1px solid #1F1F1F" }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid #1F1F1F" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "#2B5EE8" }}
          >
            <span className="text-white text-xs font-bold tracking-tight">T</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#E8E8E6" }}>Trinity</p>
            <p className="text-[11px]" style={{ color: "#5A5A5A" }}>Ad Generator</p>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4">

        {/* GENERIEREN */}
        {sectionLabel("Generieren")}
        <NavItem
          item={{ href: "/generator", label: "Generator", icon: <IconBolt />, primary: true }}
          active={isActive("/generator")}
        />

        {/* VERWALTUNG */}
        {sectionLabel("Verwaltung")}
        <div className="space-y-0.5">
          <NavItem item={{ href: "/kunden",    label: "Kunden",    icon: <IconUsers /> }}    active={isActive("/kunden")} />
          <NavItem item={{ href: "/kampagnen", label: "Kampagnen", icon: <IconClipboard /> }} active={isActive("/kampagnen")} />
          <NavItem item={{ href: "/historie",  label: "Historie",  icon: <IconHistory /> }}  active={isActive("/historie")} />
        </div>

        {/* SYSTEM */}
        {sectionLabel("System")}
        <div className="space-y-0.5">
          <NavItem item={{ href: "/uebersicht", label: "Übersicht", icon: <IconHome /> }} active={isActive("/uebersicht")} />
          {isAdmin && (
            <NavItem item={{ href: "/admin", label: "Admin", icon: <IconCog />, adminOnly: true }} active={isActive("/admin")} />
          )}
        </div>
      </nav>

      {/* ── User section ───────────────────────────────────── */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #1F1F1F" }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold"
            style={{ background: "#252525", color: "#9A9A9A" }}
          >
            {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate" style={{ color: "#C0C0BE" }}>
              {session?.user?.name}
            </p>
            <p className="text-[11px]" style={{ color: "#4A4A4A" }}>
              {session?.user?.role === "ADMIN" ? "Administrator" : "Benutzer"}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="transition-colors shrink-0"
            style={{ color: "#3A3A3A" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#8A8A8A")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3A3A3A")}
            title="Abmelden"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </aside>
  );
}
