"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompetitorTable } from "@/components/research/competitor-table";
import { PainPointMap } from "@/components/research/pain-point-map";
import { WedgeCard } from "@/components/research/wedge-card";
import { env } from "@/lib/env";

type AgentMode = "baseline" | "deepen" | "retry" | "extend";

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
}

interface ResearchState {
  run?: { status?: string; summary?: string };
  competitors: Array<{ name: string; positioning?: string; pricing_summary?: string }>;
  pain_point_clusters: Array<{ label: string; description?: string; rank?: number }>;
  opportunity_wedges: Array<{ id?: string; label: string; description?: string; score?: number }>;
}

export default function ResearchPage() {
  const params = useParams<{ projectSlug: string }>();
  const projectSlug = params.projectSlug;

  const [projectId, setProjectId] = useState<string | null>(null);
  const [state, setState] = useState<ResearchState>({
    competitors: [],
    pain_point_clusters: [],
    opportunity_wedges: []
  });
  const [advice, setAdvice] = useState("");
  const [mode, setMode] = useState<AgentMode>("baseline");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<Record<string, unknown> | null>(null);

  const loadSnapshot = useCallback(async (resolvedProjectId: string) => {
    const response = await fetch(`${env.apiBaseUrl}/projects/${resolvedProjectId}/research`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load research snapshot");
    }
    const payload = await response.json();
    setState(payload.data as ResearchState);
  }, []);

  const load = useCallback(async () => {
    if (!projectSlug) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const projectsResponse = await fetch(`${env.apiBaseUrl}/projects`, { cache: "no-store" });
      if (!projectsResponse.ok) {
        throw new Error("Failed to load projects");
      }
      const projectsPayload = await projectsResponse.json();
      const projects = (projectsPayload.data ?? []) as ProjectRow[];
      const project = projects.find((item) => item.slug === projectSlug);
      if (!project) {
        throw new Error("Project not found for this slug");
      }
      setProjectId(project.id);
      await loadSnapshot(project.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load research page");
    } finally {
      setLoading(false);
    }
  }, [loadSnapshot, projectSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const runResearch = useCallback(
    async (endpoint: "run" | "advise") => {
      if (!projectId) {
        return;
      }
      setRunning(true);
      setError(null);
      try {
        const response = await fetch(`${env.apiBaseUrl}/projects/${projectId}/research/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advice: advice.trim() || null,
            mode
          })
        });
        if (!response.ok) {
          throw new Error(`Research ${endpoint} failed`);
        }
        const payload = await response.json();
        const data = payload.data ?? {};
        setLastTrace((data.agent_trace ?? null) as Record<string, unknown> | null);
        setState({
          run: data.run,
          competitors: data.competitors ?? [],
          pain_point_clusters: data.pain_point_clusters ?? [],
          opportunity_wedges: data.opportunity_wedges ?? []
        });
      } catch (runError) {
        setError(runError instanceof Error ? runError.message : "Failed to run research");
      } finally {
        setRunning(false);
      }
    },
    [advice, mode, projectId]
  );

  const continueHref = useMemo(() => `/app/projects/${projectSlug}/positioning`, [projectSlug]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Research</h2>
          <p className="mt-1 text-sm text-fg-muted">Run the research agent, then steer it with direct advice.</p>
        </div>
        <Link
          href={continueHref}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue to Positioning
        </Link>
      </header>

      <section className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <textarea
            value={advice}
            onChange={(event) => setAdvice(event.target.value)}
            placeholder="Advise the agent: go deeper on niche X, compare approach Y, retry with a different thesis..."
            className="h-24 rounded-lg border border-edge-subtle bg-surface-elevated p-3 text-sm text-fg-primary outline-none focus:border-accent"
          />
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as AgentMode)}
            className="h-fit rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent"
          >
            <option value="baseline">baseline</option>
            <option value="deepen">deepen</option>
            <option value="retry">retry</option>
            <option value="extend">extend</option>
          </select>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => runResearch("run")}
              disabled={!projectId || running || loading}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? "Running..." : "Run"}
            </button>
            <button
              onClick={() => runResearch("advise")}
              disabled={!projectId || running || loading}
              className="rounded-lg border border-edge-subtle bg-surface-elevated px-4 py-2 text-sm font-medium text-fg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Advise
            </button>
          </div>
        </div>
        {lastTrace ? (
          <p className="mt-3 text-xs text-fg-faint">
            Provider: {String(lastTrace.provider ?? "unknown")} | mode: {String(lastTrace.mode ?? mode)}
          </p>
        ) : null}
        {state.run?.summary ? <p className="mt-3 text-sm text-fg-muted">{state.run.summary}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <h3 className="mb-4 text-sm font-semibold text-fg-primary">Competitor Board</h3>
        <CompetitorTable
          rows={state.competitors.map((item) => ({
            name: item.name,
            positioning: item.positioning,
            pricing: item.pricing_summary
          }))}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-4 text-sm font-semibold text-fg-primary">Pain Point Map</h3>
          <PainPointMap
            items={state.pain_point_clusters.map((item) => ({
              label: item.label,
              description: item.description,
              severity: (item.rank ?? 3) <= 1 ? "high" : (item.rank ?? 3) <= 2 ? "medium" : "low"
            }))}
          />
        </section>

        <section>
          <h3 className="mb-4 text-sm font-semibold text-fg-primary">Top Wedges</h3>
          <div className="space-y-3">
            {state.opportunity_wedges.map((wedge, index) => (
              <div key={`${wedge.id ?? wedge.label}-${index}`} className="animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
                <WedgeCard wedge={wedge} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
