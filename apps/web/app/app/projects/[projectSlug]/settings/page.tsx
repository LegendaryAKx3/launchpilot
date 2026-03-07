import { DeleteProjectButton } from "@/components/project/delete-project-button";
import { serverApiFetch } from "@/lib/api";

interface Project {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  goal: string | null;
  website_url?: string | null;
  repo_url?: string | null;
  status: string;
}

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;

  // Fetch project data
  const projects = (await serverApiFetch<Project[]>("/projects")) ?? [];
  const project = projects.find((p) => p.slug === projectSlug);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-fg-primary">Project Settings</h2>
        <p className="text-sm text-fg-secondary">Metadata, source docs, connected accounts, and project controls.</p>
      </header>

      <section className="rounded-lg border border-edge-subtle bg-surface-elevated p-4">
        <h3 className="text-sm font-medium text-fg-primary">General</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Name</span>
            <span className="text-sm text-fg-secondary">{project?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Summary</span>
            <span className="text-sm text-fg-secondary">{project?.summary ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Goal</span>
            <span className="text-sm text-fg-secondary">{project?.goal ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Status</span>
            <span className="text-sm capitalize text-fg-secondary">{project?.status ?? "—"}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-edge-subtle bg-surface-elevated p-4">
        <h3 className="text-sm font-medium text-fg-primary">URLs</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Website</span>
            {project?.website_url ? (
              <a
                href={project.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {project.website_url}
              </a>
            ) : (
              <span className="text-sm text-fg-faint">Not set</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Repository</span>
            {project?.repo_url ? (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {project.repo_url}
              </a>
            ) : (
              <span className="text-sm text-fg-faint">Not set</span>
            )}
          </div>
        </div>
      </section>

      {project && (
        <section className="rounded-lg border border-red-500/20 bg-surface-elevated p-4">
          <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
          <p className="mt-2 text-sm text-fg-muted">
            Permanently delete this project and all associated data.
          </p>
          <div className="mt-4">
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        </section>
      )}
    </div>
  );
}
