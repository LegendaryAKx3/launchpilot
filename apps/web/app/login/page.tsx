import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getAuth0ConfigError, isAuthEnabled } from "@/lib/auth0";

export default function LoginPage() {
  const authConfigured = isAuthEnabled();
  const authConfigError = getAuth0ConfigError();

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Theme toggle in corner */}
      <div className="fixed right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-blue-400 shadow-glow">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <div className="rounded-xl border border-edge-subtle bg-surface-muted p-8 shadow-card">
          <h1 className="mb-2 text-center text-2xl font-bold text-fg-primary">
            Welcome back
          </h1>
          <p className="mb-6 text-center text-sm text-fg-muted">
            Sign in to LaunchPilot with your preferred provider.
          </p>

          {!authConfigured && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  Auth0 is not configured. Add web auth vars in <code className="rounded bg-surface-elevated px-1">apps/web/.env.local</code> and restart.{" "}
                  {authConfigError ? <span className="block pt-1 text-amber-700 dark:text-amber-300">{authConfigError}</span> : null}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/auth/login?connection=github&returnTo=%2Fapp%2Fprojects"
              aria-disabled={!authConfigured}
              className={`flex items-center justify-center gap-3 rounded-lg border border-edge-subtle px-4 py-2.5 text-sm font-medium transition-colors ${
                authConfigured
                  ? "bg-surface-elevated text-fg-secondary hover:border-edge-muted hover:text-fg-primary"
                  : "pointer-events-none bg-surface-muted text-fg-faint opacity-60"
              }`}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </Link>
            <Link
              href="/auth/login?connection=google-oauth2&returnTo=%2Fapp%2Fprojects"
              aria-disabled={!authConfigured}
              className={`flex items-center justify-center gap-3 rounded-lg border border-edge-subtle px-4 py-2.5 text-sm font-medium transition-colors ${
                authConfigured
                  ? "bg-surface-elevated text-fg-secondary hover:border-edge-muted hover:text-fg-primary"
                  : "pointer-events-none bg-surface-muted text-fg-faint opacity-60"
              }`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Link>
            <Link
              href="/auth/login?returnTo=%2Fapp%2Fprojects"
              aria-disabled={!authConfigured}
              className={`flex items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                authConfigured
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "pointer-events-none bg-surface-muted text-fg-faint opacity-60"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                />
              </svg>
              {authConfigured ? "Continue with Passkey / MFA" : "Auth0 Configuration Required"}
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-fg-faint">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
