import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isAuthEnabled } from "@/lib/auth0";

export default function LandingPage() {
  const authEnabled = isAuthEnabled();

  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 mb-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-blue-400 shadow-glow-sm">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-fg-primary">LaunchPilot</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          <Link href="/login" className="text-fg-secondary transition-colors hover:text-fg-primary">
            Log in
          </Link>
          <Link
            href={authEnabled ? "/auth/login" : "/app"}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {authEnabled ? "Get Started" : "Open App"}
          </Link>
        </nav>
      </header>

      <section className="relative z-10 grid flex-1 items-center gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Multi-agent launch flow
          </p>
          <h2 className="text-5xl font-bold tracking-tight text-fg-primary">
            Turn a rough build into a{" "}
            <span className="text-gradient">real launch system.</span>
          </h2>
          <p className="max-w-xl text-lg text-fg-secondary">
            Research competitors, choose a positioning wedge, generate assets, and execute supervised outbound with approvals and memory.
          </p>
          <div className="flex gap-3 pt-2">
            <Link
              href={authEnabled ? "/auth/login" : "/app"}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30"
            >
              {authEnabled ? "Start with Auth0" : "Start in Dev Mode"}
            </Link>
            <Link
              href="/app"
              className="rounded-lg border border-edge-subtle bg-surface-muted px-5 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:border-edge-muted hover:text-fg-primary"
            >
              Open Projects
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-edge-subtle bg-surface-muted p-6 shadow-card">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-primary">
            <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            How it works
          </h3>
          <ol className="space-y-4 text-sm">
            {[
              { step: "1", text: "Create project and brief" },
              { step: "2", text: "Run research and positioning agents" },
              { step: "3", text: "Generate launch plan and assets" },
              { step: "4", text: "Approve and send outbound with step-up auth" }
            ].map((item, index) => (
              <li
                key={item.step}
                className="flex items-center gap-3 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated font-mono text-xs font-semibold text-accent">
                  {item.step}
                </span>
                <span className="text-fg-secondary">{item.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
