import { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { auth0 } from "@/lib/auth0";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  if (!auth0) {
    redirect("/login");
  }

  const session = await auth0.getSession();
  if (!session) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
