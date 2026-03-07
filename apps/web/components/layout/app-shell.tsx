import { ReactNode } from "react";

import { LeftSidebar } from "@/components/layout/left-sidebar";
import { TopBar } from "@/components/layout/top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-surface-base">
      {/* Subtle grid pattern overlay */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-100" />

      {/* Gradient accents */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <TopBar />
      <div className="relative flex min-h-[calc(100vh-56px)]">
        <LeftSidebar />
        <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
