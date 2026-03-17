import { ReactNode } from "react";

import Link from "next/link";

import { ProjectFlowNav } from "@/components/project/project-flow-nav";
import { ProjectGroupChat } from "@/components/project/project-group-chat";
import { ProjectUtilityTabs } from "@/components/project/project-utility-tabs";

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

      <ProjectUtilityTabs projectSlug={projectSlug} />

      <div className="grid h-[calc(100vh-280px)] min-h-[620px] gap-4 lg:grid-cols-2">
        <div className="min-w-0 overflow-y-auto">
          <ProjectGroupChat />
        </div>
        <div className="min-w-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
