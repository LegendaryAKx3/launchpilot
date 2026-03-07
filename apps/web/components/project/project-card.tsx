import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";

interface ProjectCardProps {
  project: {
    slug: string;
    name: string;
    stage: string;
    wedge?: string;
    approvals?: number;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/app/projects/${project.slug}`}
      className="group relative block rounded-xl border border-edge-subtle bg-surface-muted p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-edge-muted hover:shadow-lg"
    >
      {/* Hover gradient effect */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-accent/0 via-accent/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-fg-primary transition-colors group-hover:text-accent">
            {project.name}
          </h3>
          <StatusBadge status={project.stage} />
        </div>

        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-2 text-sm">
            <span className="text-fg-faint">Wedge:</span>
            <span className="font-medium text-fg-secondary">
              {project.wedge ?? "Not selected"}
            </span>
          </p>
          <p className="flex items-center gap-2 text-sm">
            <span className="text-fg-faint">Approvals:</span>
            <span className="font-mono text-accent">{project.approvals ?? 0}</span>
          </p>
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-0 right-0 text-fg-faint opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
