import Link from "next/link";

import { ProjectCard } from "@/components/project/project-card";
import { StatCard } from "@/components/ui/stat-card";

const projects = [
  {
    slug: "growth-launchpad",
    name: "Growth Launchpad",
    stage: "active",
    wedge: "Hackathon to first users",
    approvals: 1
  },
  {
    slug: "docs-agent",
    name: "Docs Agent",
    stage: "draft",
    wedge: "Ship answers from your docs faster",
    approvals: 0
  }
];

const actions = [
  {
    title: "Create a new project",
    description: "Start from brief to launch flow in under 2 minutes.",
    href: "/app/projects/new",
    cta: "Create Project",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    )
  },
  {
    title: "Resume execution",
    description: "Jump into assets, outreach, and approvals instantly.",
    href: "/app/projects/growth-launchpad/execution",
    cta: "Open Execution",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    title: "Review approvals",
    description: "Approve sensitive actions before they are executed.",
    href: "/app/projects/growth-launchpad/approvals",
    cta: "Open Approvals",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    )
  }
];

export default function ProjectsDashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">Projects Dashboard</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Everything is organized by project and stage. No workspace switching.
          </p>
        </div>
        <Link
          href="/app/projects/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Project
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-3 stagger">
        <StatCard
          label="Active Projects"
          value={projects.length}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />
        <StatCard
          label="Pending Approvals"
          value={1}
          trend="up"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Actions This Week"
          value={8}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      <section>
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-fg-faint">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-3 stagger">
          {actions.map((action, index) => (
            <article
              key={action.title}
              className="group rounded-xl border border-edge-subtle bg-surface-muted p-5 transition-all duration-200 hover:border-edge-muted animate-slide-up"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-fg-muted transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                {action.icon}
              </div>
              <h3 className="text-sm font-semibold text-fg-primary">{action.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{action.description}</p>
              <Link
                href={action.href}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-subtle px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
              >
                {action.cta}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-fg-faint">
          Your Projects
        </h2>
        <div className="grid gap-4 md:grid-cols-2 stagger">
          {projects.map((project, index) => (
            <div key={project.slug} className="animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
