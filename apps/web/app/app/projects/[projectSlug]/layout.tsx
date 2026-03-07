import { ReactNode } from "react";

import Link from "next/link";

import { ProjectFlowNav } from "@/components/project/project-flow-nav";

export default async function ProjectLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
            Project
          </p>
          <h1 className="mt-1 text-2xl font-bold capitalize text-fg-primary">
            {projectSlug.replace(/-/g, " ")}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Follow the flow: research, positioning, execution, and approvals.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/projects"
            className="flex items-center gap-2 rounded-lg border border-edge-subtle bg-surface-muted px-3 py-2 text-sm font-medium text-fg-secondary transition-colors hover:border-edge-muted hover:text-fg-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Projects
          </Link>
          <Link
            href={`/app/projects/${projectSlug}/execution`}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run Next Action
          </Link>
        </div>
      </header>

      <ProjectFlowNav projectSlug={projectSlug} />

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/projects/${projectSlug}/memory`}
          className="flex items-center gap-2 rounded-lg border border-edge-subtle bg-surface-muted px-3 py-1.5 text-sm font-medium text-fg-secondary transition-colors hover:border-edge-muted hover:text-fg-primary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Memory
        </Link>
        <Link
          href={`/app/projects/${projectSlug}/settings`}
          className="flex items-center gap-2 rounded-lg border border-edge-subtle bg-surface-muted px-3 py-1.5 text-sm font-medium text-fg-secondary transition-colors hover:border-edge-muted hover:text-fg-primary"
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
          Settings
        </Link>
      </div>

      {children}
    </div>
  );
}
