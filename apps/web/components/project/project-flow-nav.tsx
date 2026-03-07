"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const steps = [
  {
    key: "overview",
    label: "Overview",
    icon: "1",
    href: (projectSlug: string) => `/app/projects/${projectSlug}`
  },
  {
    key: "research",
    label: "Research",
    icon: "2",
    href: (projectSlug: string) => `/app/projects/${projectSlug}/research`
  },
  {
    key: "positioning",
    label: "Positioning",
    icon: "3",
    href: (projectSlug: string) => `/app/projects/${projectSlug}/positioning`
  },
  {
    key: "execution",
    label: "Execution",
    icon: "4",
    href: (projectSlug: string) => `/app/projects/${projectSlug}/execution`
  },
  {
    key: "approvals",
    label: "Approvals",
    icon: "5",
    href: (projectSlug: string) => `/app/projects/${projectSlug}/approvals`
  }
];

export function ProjectFlowNav({ projectSlug }: { projectSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="rounded-xl border border-edge-subtle bg-surface-muted p-1.5">
      <div className="grid grid-cols-5 gap-1">
        {steps.map((step) => {
          const isActive = pathname === step.href(projectSlug);
          return (
            <Link
              key={step.key}
              href={step.href(projectSlug)}
              className={cn(
                "relative flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
                  : "text-fg-muted hover:bg-surface-elevated hover:text-fg-primary"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full font-mono text-xs",
                  isActive ? "bg-white/20" : "bg-surface-elevated"
                )}
              >
                {step.icon}
              </span>
              <span className="hidden md:inline">{step.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
