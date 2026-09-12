import { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { auth0 } from "@/lib/auth0";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  // With Auth0 unconfigured the API runs in dev mode with a fallback user,
  // so let the app through instead of bouncing to a login page that cannot work.
  if (auth0) {
    const session = await auth0.getSession();
    if (!session) {
      redirect("/login");
    }
  }

  return (
    <AppShell>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}
