"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  {
    label: "Dashboard",
    href: "/app/projects",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    )
  },
  {
    label: "New Project",
    href: "/app/projects/new",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    )
  },
  {
    label: "Security",
    href: "/app/settings/security",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    )
  }
];

export function LeftSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-edge-subtle bg-surface-subtle p-4 md:block">
      <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
        Navigation
      </p>
      <nav className="space-y-1">
        {links.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/app/projects" && pathname === "/app/projects");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "border-l-2 border-accent bg-accent-subtle text-accent"
                  : "text-fg-secondary hover:bg-surface-elevated hover:text-fg-primary"
              )}
            >
              <span className={cn(isActive ? "text-accent" : "text-fg-muted")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer with version */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="rounded-lg border border-edge-subtle bg-surface-muted p-3">
          <p className="font-mono text-[10px] text-fg-faint">LaunchPilot v0.1.0</p>
          <p className="mt-1 text-xs text-fg-muted">Multi-agent launch flow</p>
        </div>
      </div>
    </aside>
  );
}
