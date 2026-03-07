"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionQueue } from "@/components/execution/action-queue";
import { AssetCard } from "@/components/execution/asset-card";
import { OutreachTable } from "@/components/execution/outreach-table";
import { PlanBoard } from "@/components/execution/plan-board";
import { env } from "@/lib/env";

type AgentMode = "baseline" | "deepen" | "retry" | "extend";

interface ProjectRow {
  id: string;
  slug: string;
}

interface ExecutionState {
  plans: Array<{ id: string }>;
  tasks: Array<{ id: string; day_number?: number; title: string; status?: string }>;
  assets: Array<{ id: string; title?: string; asset_type: string; status: string }>;
  contacts: Array<{ id: string; name?: string; email?: string; segment?: string }>;
  batches: Array<{ id: string; status: string; subject_line?: string; send_count?: number }>;
  messages: Array<{ id: string; batch_id: string; status: string }>;
}

export default function ExecutionPage() {
  const params = useParams<{ projectSlug: string }>();
  const projectSlug = params.projectSlug;

  const [projectId, setProjectId] = useState<string | null>(null);
  const [state, setState] = useState<ExecutionState>({
    plans: [],
    tasks: [],
    assets: [],
    contacts: [],
    batches: [],
    messages: []
  });
  const [advice, setAdvice] = useState("");
  const [mode, setMode] = useState<AgentMode>("baseline");
  const [assetTypes, setAssetTypes] = useState("landing_copy,email_copy");
  const [assetCount, setAssetCount] = useState(1);
  const [subjectLine, setSubjectLine] = useState("Quick idea for your launch");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<Record<string, unknown> | null>(null);

  const loadState = useCallback(async (resolvedProjectId: string) => {
    const response = await fetch(`${env.apiBaseUrl}/projects/${resolvedProjectId}/execution/state`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load execution state");
    }
    const payload = await response.json();
    setState(payload.data as ExecutionState);
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
      await loadState(project.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load execution page");
    } finally {
      setLoading(false);
    }
  }, [loadState, projectSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const runAgentAction = useCallback(
    async (
      key: string,
      path: string,
      body: Record<string, unknown>
    ) => {
      if (!projectId) {
        return;
      }
      setRunningAction(key);
      setError(null);
      try {
        const response = await fetch(`${env.apiBaseUrl}/projects/${projectId}/execution/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          throw new Error(`Failed action: ${key}`);
        }
        const payload = await response.json();
        const data = payload.data ?? {};
        setLastTrace((data.agent_trace ?? null) as Record<string, unknown> | null);
        await loadState(projectId);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Failed execution action");
      } finally {
        setRunningAction(null);
      }
    },
    [loadState, projectId]
  );

  const addContact = useCallback(async () => {
    if (!projectId || !contactEmail.trim()) {
      return;
    }
    setRunningAction("add-contact");
    setError(null);
    try {
      const response = await fetch(`${env.apiBaseUrl}/projects/${projectId}/execution/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: [
            {
              name: contactName.trim() || null,
              email: contactEmail.trim(),
              segment: "manual"
            }
          ]
        })
      });
      if (!response.ok) {
        throw new Error("Failed to add contact");
      }
      setContactName("");
      setContactEmail("");
      await loadState(projectId);
    } catch (contactError) {
      setError(contactError instanceof Error ? contactError.message : "Failed to add contact");
    } finally {
      setRunningAction(null);
    }
  }, [contactEmail, contactName, loadState, projectId]);

  const taskRows = useMemo(
    () =>
      state.tasks.map((task) => ({
        day_number: task.day_number ?? 1,
        title: task.title,
        completed: task.status === "completed" || task.status === "succeeded"
      })),
    [state.tasks]
  );

  const queueItems = useMemo(
    () =>
      state.batches.map((batch) => ({
        title: batch.subject_line ? `Email batch: ${batch.subject_line}` : `Email batch ${batch.id.slice(0, 8)}`,
        status: batch.status,
        reason: batch.status === "pending_approval" ? "Approve this batch before sending." : `sent: ${batch.send_count ?? 0}`
      })),
    [state.batches]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-fg-primary">Execution</h2>
          <p className="mt-1 text-sm text-fg-muted">Run plan, assets, and outreach. Advise the agent at each step.</p>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <textarea
            value={advice}
            onChange={(event) => setAdvice(event.target.value)}
            placeholder="Advise the execution agent: focus on faster experiments, try a different channel, add more depth..."
            className="h-20 rounded-lg border border-edge-subtle bg-surface-elevated p-3 text-sm text-fg-primary outline-none focus:border-accent"
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
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <button
            onClick={() =>
              runAgentAction("plan", "plan/advise", {
                advice: advice.trim() || null,
                mode
              })
            }
            disabled={!projectId || loading || runningAction !== null}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runningAction === "plan" ? "Planning..." : "Run Plan"}
          </button>
          <button
            onClick={() =>
              runAgentAction("assets", "assets/advise", {
                types: assetTypes
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
                count: assetCount,
                advice: advice.trim() || null,
                mode
              })
            }
            disabled={!projectId || loading || runningAction !== null}
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-4 py-2.5 text-sm font-medium text-fg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runningAction === "assets" ? "Generating..." : "Generate Assets"}
          </button>
          <button
            onClick={() =>
              runAgentAction("outreach", "email-batch/prepare/advise", {
                subject_line: subjectLine || null,
                max_contacts: 10,
                advice: advice.trim() || null,
                mode
              })
            }
            disabled={!projectId || loading || runningAction !== null}
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-4 py-2.5 text-sm font-medium text-fg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runningAction === "outreach" ? "Preparing..." : "Prepare Outreach"}
          </button>
          <Link
            href={`/app/projects/${projectSlug}/approvals`}
            className="flex items-center justify-center rounded-lg border border-edge-subtle bg-surface-elevated px-4 py-2.5 text-sm font-medium text-fg-secondary"
          >
            Review Approvals
          </Link>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            value={assetTypes}
            onChange={(event) => setAssetTypes(event.target.value)}
            placeholder="asset types (comma-separated)"
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent"
          />
          <input
            type="number"
            min={1}
            max={5}
            value={assetCount}
            onChange={(event) => setAssetCount(Number(event.target.value))}
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent"
          />
          <input
            value={subjectLine}
            onChange={(event) => setSubjectLine(event.target.value)}
            placeholder="outreach subject line"
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent"
          />
        </div>

        {lastTrace ? (
          <p className="mt-3 text-xs text-fg-faint">
            Provider: {String(lastTrace.provider ?? "unknown")} | mode: {String(lastTrace.mode ?? mode)}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </header>

      <section>
        <h3 className="mb-4 text-sm font-semibold text-fg-primary">7-Day Plan</h3>
        <PlanBoard tasks={taskRows} />
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold text-fg-primary">Generated Assets</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {state.assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <h3 className="mb-3 text-sm font-semibold text-fg-primary">Contacts</h3>
        <div className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="name"
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent"
          />
          <input
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="email"
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent"
          />
          <button
            onClick={addContact}
            disabled={!projectId || runningAction !== null}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runningAction === "add-contact" ? "Adding..." : "Add Contact"}
          </button>
        </div>
        <OutreachTable rows={state.contacts.map((item) => ({ ...item, status: "ready" }))} />
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold text-fg-primary">Action Queue</h3>
        <ActionQueue items={queueItems} />
      </section>
    </div>
  );
}
