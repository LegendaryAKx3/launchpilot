import Link from "next/link";
import { notFound } from "next/navigation";

import { serverApiFetch } from "@/lib/api";

interface Project {
  id: string;
  slug: string;
  name: string;
  stage: string;
  summary: string | null;
  goal: string | null;
  status: string;
}

interface MemoryEntry {
  id: string;
  memory_key: string;
  memory_value: Record<string, unknown>;
  memory_type: string;
}

interface ActivityEvent {
  id: string;
  verb: string;
  object_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ResearchState {
  competitors: Array<{ name: string; positioning?: string; pricing_summary?: string }>;
  pain_point_clusters: Array<{ label: string; description?: string; rank?: number }>;
  opportunity_wedges: Array<{ label: string; description?: string; score?: number }>;
}

interface PositioningVersion {
  id: string;
  selected: boolean;
  icp: string;
  wedge: string;
  headline?: string;
  positioning_statement?: string;
}

interface ExecutionState {
  tasks: Array<{ id: string; title: string; status?: string }>;
  assets: Array<{ id: string; asset_type: string; status: string }>;
  contacts: Array<{ id: string }>;
  batches: Array<{ id: string; status: string }>;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;

  // Fetch project data
  const projects = (await serverApiFetch<Project[]>("/projects")) ?? [];
  const project = projects.find((p) => p.slug === projectSlug);

  if (!project) {
    notFound();
  }

  // Fetch all related data if project exists
  const [memory, activity, research, positioningData, execution] = project
    ? await Promise.all([
        serverApiFetch<MemoryEntry[]>(`/projects/${project.id}/memory`),
        serverApiFetch<ActivityEvent[]>(`/projects/${project.id}/activity`),
        serverApiFetch<ResearchState>(`/projects/${project.id}/research`),
        serverApiFetch<{ versions?: PositioningVersion[] }>(`/projects/${project.id}/positioning`),
        serverApiFetch<ExecutionState>(`/projects/${project.id}/execution/state`)
      ])
    : [null, null, null, null, null];

  // Get selected positioning
  const positioning = positioningData?.versions?.find((v) => v.selected) ?? positioningData?.versions?.[0];

  // Determine step completion based on stage
  const stageOrder = ["idea", "research", "positioning", "execution", "completed"];
  const currentStageIndex = stageOrder.indexOf(project?.stage ?? "idea");

  const steps = [
    {
      number: "1",
      label: "Run Research",
      href: `/app/projects/${projectSlug}/research`,
      completed: currentStageIndex > 0,
      primary: currentStageIndex === 0
    },
    {
      number: "2",
      label: "Choose Positioning",
      href: `/app/projects/${projectSlug}/positioning`,
      completed: currentStageIndex > 1,
      primary: currentStageIndex === 1
    },
    {
      number: "3",
      label: "Generate Launch Actions",
      href: `/app/projects/${projectSlug}/execution`,
      completed: currentStageIndex > 2,
      primary: currentStageIndex === 2 || currentStageIndex === 3
    }
  ];

  // Format timeline from activity
  const timeline =
    activity?.slice(0, 5).map((a) => ({
      text: `${a.verb}${a.object_type ? ` ${a.object_type}` : ""}`,
      time: formatTimeAgo(a.created_at)
    })) ?? [];

  // Stats
  const completedTasks = execution?.tasks?.filter((t) => t.status === "completed" || t.status === "succeeded").length ?? 0;
  const totalTasks = execution?.tasks?.length ?? 0;
  const pendingBatches = execution?.batches?.filter((b) => b.status === "pending_approval").length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Steps + Stats Row */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
            <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Here
          </h2>
          <p className="mt-2 text-sm text-fg-muted">Use these primary actions to move the project forward in order.</p>
          <div className="mt-4 space-y-2">
            {steps.map((step, index) => (
              <Link
                key={step.number}
                href={step.href}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-200 animate-slide-up ${
                  step.primary
                    ? "border-accent bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent-hover"
                    : step.completed
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                      : "border-edge-subtle bg-surface-elevated text-fg-secondary hover:border-edge-muted hover:text-fg-primary"
                }`}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs ${
                    step.completed ? "bg-emerald-500/20" : step.primary ? "bg-white/20" : "bg-surface-elevated"
                  }`}
                >
                  {step.completed ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </span>
                {step.label}
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
            <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Quick Stats
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
              <p className="text-xs text-fg-muted">Stage</p>
              <p className="mt-1 text-lg font-semibold capitalize text-accent">{project?.stage ?? "idea"}</p>
            </div>
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
              <p className="text-xs text-fg-muted">Competitors</p>
              <p className="mt-1 text-lg font-semibold text-fg-primary">{research?.competitors?.length ?? 0}</p>
            </div>
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
              <p className="text-xs text-fg-muted">Tasks</p>
              <p className="mt-1 text-lg font-semibold text-fg-primary">
                {completedTasks}/{totalTasks}
              </p>
            </div>
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
              <p className="text-xs text-fg-muted">Pending Approvals</p>
              <p className={`mt-1 text-lg font-semibold ${pendingBatches > 0 ? "text-amber-400" : "text-fg-primary"}`}>
                {pendingBatches}
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Research + Positioning Insights */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Research Summary */}
        <article className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
              <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Research Insights
            </h2>
            <Link href={`/app/projects/${projectSlug}/research`} className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>

          {(!research?.competitors?.length && !research?.opportunity_wedges?.length && !research?.pain_point_clusters?.length) ? (
            <p className="mt-4 text-sm text-fg-muted">No research data yet. Run the Research Agent to get started.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {/* Top Opportunity Wedge */}
              {research?.opportunity_wedges?.[0] && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-xs text-fg-muted">Top Opportunity</p>
                  <p className="mt-1 text-sm font-medium text-fg-primary">{research.opportunity_wedges[0].label}</p>
                  {research.opportunity_wedges[0].description && (
                    <p className="mt-1 text-xs text-fg-secondary line-clamp-2">{research.opportunity_wedges[0].description}</p>
                  )}
                </div>
              )}

              {/* Competitors + Pain Points Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
                  <p className="text-xs text-fg-muted">Competitors</p>
                  {research?.competitors?.length ? (
                    <div className="mt-1.5 space-y-1">
                      {research.competitors.slice(0, 3).map((comp, i) => (
                        <p key={`comp-${i}`} className="text-sm text-fg-secondary truncate">{comp.name}</p>
                      ))}
                      {(research.competitors.length > 3) && (
                        <p className="text-xs text-fg-faint">+{research.competitors.length - 3} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-fg-faint">None found</p>
                  )}
                </div>
                <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
                  <p className="text-xs text-fg-muted">Pain Points</p>
                  {research?.pain_point_clusters?.length ? (
                    <div className="mt-1.5 space-y-1">
                      {research.pain_point_clusters.slice(0, 3).map((pain, i) => (
                        <p key={`pain-${i}`} className="text-sm text-fg-secondary truncate">{pain.label}</p>
                      ))}
                      {(research.pain_point_clusters.length > 3) && (
                        <p className="text-xs text-fg-faint">+{research.pain_point_clusters.length - 3} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-fg-faint">None found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </article>

        {/* Positioning Summary */}
        <article className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Selected Positioning
            </h2>
            <Link href={`/app/projects/${projectSlug}/positioning`} className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>

          {!positioning ? (
            <p className="mt-4 text-sm text-fg-muted">No positioning selected yet. Run the Positioning Agent to generate options.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {positioning.headline && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <p className="text-xs text-fg-muted">Headline</p>
                  <p className="mt-1 text-sm font-medium text-fg-primary">{positioning.headline}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
                  <p className="text-xs text-fg-muted">ICP</p>
                  <p className="mt-1 text-sm text-fg-secondary line-clamp-2">{positioning.icp || "Not defined"}</p>
                </div>
                <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
                  <p className="text-xs text-fg-muted">Wedge</p>
                  <p className="mt-1 text-sm text-fg-secondary line-clamp-2">{positioning.wedge || "Not defined"}</p>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>

      {/* Execution Summary */}
      {(totalTasks > 0 || (execution?.assets?.length ?? 0) > 0) && (
        <section className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Execution Progress
            </h2>
            <Link href={`/app/projects/${projectSlug}/execution`} className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3 text-center">
              <p className="text-2xl font-bold text-fg-primary">{totalTasks}</p>
              <p className="text-xs text-fg-muted">Tasks</p>
            </div>
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{completedTasks}</p>
              <p className="text-xs text-fg-muted">Completed</p>
            </div>
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3 text-center">
              <p className="text-2xl font-bold text-fg-primary">{execution?.assets?.length ?? 0}</p>
              <p className="text-xs text-fg-muted">Assets</p>
            </div>
            <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3 text-center">
              <p className="text-2xl font-bold text-fg-primary">{execution?.contacts?.length ?? 0}</p>
              <p className="text-xs text-fg-muted">Contacts</p>
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Recent Activity
        </h2>
        <div className="relative mt-4">
          {timeline.length === 0 ? (
            <p className="text-sm text-fg-muted">No activity yet.</p>
          ) : (
            <>
              <div className="absolute bottom-4 left-[11px] top-0 w-0.5 bg-edge-subtle" />
              <ul className="space-y-4">
                {timeline.map((item, index) => (
                  <li
                    key={`${item.text}-${index}`}
                    className="relative flex gap-4 animate-slide-up"
                    style={{ animationDelay: `${index * 75}ms` }}
                  >
                    <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-surface-muted">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm capitalize text-fg-secondary">{item.text}</p>
                      <p className="mt-0.5 text-xs text-fg-faint">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
