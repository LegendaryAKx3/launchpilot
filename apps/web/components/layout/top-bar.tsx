"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-edge-subtle bg-surface-base/80 px-4 backdrop-blur-md">
      {/* Logo */}
      <Link href="/app/projects" className="flex items-center gap-3 transition-opacity hover:opacity-80">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-blue-400 shadow-glow-sm">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-fg-primary">LaunchPilot</span>
      </Link>

      {/* Command Palette Trigger */}
      <button className="hidden items-center gap-2 rounded-lg border border-edge-subtle bg-surface-muted px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-edge-muted hover:text-fg-secondary md:flex">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search...</span>
        <kbd className="ml-2 rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-fg-faint">
          <span className="text-2xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Navigation */}
      <nav className="flex items-center gap-2">
        <Link
          href="/app/projects"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            pathname === "/app/projects"
              ? "bg-surface-elevated text-fg-primary"
              : "text-fg-secondary hover:bg-surface-elevated hover:text-fg-primary"
          )}
        >
          Projects
        </Link>
        <Link
          href="/app/projects/new"
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          New Project
        </Link>
        <Link
          href="/app/settings/security"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            pathname?.startsWith("/app/settings")
              ? "bg-surface-elevated text-fg-primary"
              : "text-fg-secondary hover:bg-surface-elevated hover:text-fg-primary"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
        <div className="ml-1 h-4 w-px bg-edge-subtle" />
        <ThemeToggle />
        <div className="h-4 w-px bg-edge-subtle" />
        <Link
          href="/auth/logout"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          Logout
        </Link>
      </nav>
    </header>
  );
}
