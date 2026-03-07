"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { IcpCard } from "@/components/positioning/icp-card";
import { PositioningPreview } from "@/components/positioning/positioning-preview";
import { PricingDirectionCard } from "@/components/positioning/pricing-direction-card";
import { env } from "@/lib/env";

type AgentMode = "baseline" | "deepen" | "retry" | "extend";

interface ProjectRow {
  id: string;
  slug: string;
}

interface PositioningVersion {
  id: string;
  selected: boolean;
  icp: string;
  wedge: string;
  positioning_statement: string;
  headline?: string;
  subheadline?: string;
  benefits?: string[];
  pricing_direction?: string;
}

export default function PositioningPage() {
  const params = useParams<{ projectSlug: string }>();
  const projectSlug = params.projectSlug;

  const [projectId, setProjectId] = useState<string | null>(null);
  const [versions, setVersions] = useState<PositioningVersion[]>([]);
  const [advice, setAdvice] = useState("");
  const [mode, setMode] = useState<AgentMode>("baseline");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<Record<string, unknown> | null>(null);

  const selected = versions.find((item) => item.selected) ?? versions[0];

  const loadVersions = useCallback(async (resolvedProjectId: string) => {
    const response = await fetch(`${env.apiBaseUrl}/projects/${resolvedProjectId}/positioning`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load positioning versions");
    }
    const payload = await response.json();
    setVersions(((payload.data?.versions ?? []) as PositioningVersion[]).filter((item) => item.id));
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
      await loadVersions(project.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load positioning page");
    } finally {
      setLoading(false);
    }
  }, [loadVersions, projectSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const runPositioning = useCallback(
    async (endpoint: "run" | "advise") => {
      if (!projectId) {
        return;
      }
      setRunning(true);
      setError(null);
      try {
        const response = await fetch(`${env.apiBaseUrl}/projects/${projectId}/positioning/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advice: advice.trim() || null,
            mode
          })
        });
        if (!response.ok) {
          throw new Error(`Positioning ${endpoint} failed`);
        }
        const payload = await response.json();
        const data = payload.data ?? {};
        setLastTrace((data.agent_trace ?? null) as Record<string, unknown> | null);
        await loadVersions(projectId);
      } catch (runError) {
        setError(runError instanceof Error ? runError.message : "Failed to run positioning");
      } finally {
        setRunning(false);
      }
    },
    [advice, loadVersions, mode, projectId]
  );

  const selectVersion = useCallback(
    async (versionId: string) => {
      if (!projectId) {
        return;
      }
      setError(null);
      try {
        const response = await fetch(`${env.apiBaseUrl}/projects/${projectId}/positioning/select/${versionId}`, {
          method: "POST"
        });
        if (!response.ok) {
          throw new Error("Failed to select positioning version");
        }
        await loadVersions(projectId);
      } catch (selectError) {
        setError(selectError instanceof Error ? selectError.message : "Failed to select positioning version");
      }
    },
    [loadVersions, projectId]
  );

  const continueHref = useMemo(() => `/app/projects/${projectSlug}/execution`, [projectSlug]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Positioning</h2>
          <p className="mt-1 text-sm text-fg-muted">Guide the positioning agent and select the version you want to execute.</p>
        </div>
        <Link
          href={continueHref}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue to Execution
        </Link>
      </header>

      <section className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <textarea
            value={advice}
            onChange={(event) => setAdvice(event.target.value)}
            placeholder="Advise the positioning agent: narrower ICP, different wedge, stronger objection handling..."
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
              onClick={() => runPositioning("run")}
              disabled={!projectId || loading || running}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? "Running..." : "Run"}
            </button>
            <button
              onClick={() => runPositioning("advise")}
              disabled={!projectId || loading || running}
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
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-4 text-sm font-semibold text-fg-primary">Generated Versions</h3>
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div key={version.id} className="animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
                <IcpCard icp={`${version.icp} | ${version.wedge}`} selected={version.selected} onSelect={() => selectVersion(version.id)} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <PositioningPreview
            headline={selected?.headline}
            subheadline={selected?.subheadline}
            statement={selected?.positioning_statement}
            benefits={selected?.benefits ?? []}
          />
          <PricingDirectionCard value={selected?.pricing_direction} />
        </section>
      </div>
    </div>
  );
}
