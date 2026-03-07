"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgentChat } from "@/components/chat/agent-chat";
import { Message } from "@/components/chat/chat-message";
import {
  InsightCard,
  InsightEmpty,
  InsightListItem,
  InsightPanel,
  InsightSection
} from "@/components/chat/insight-panel";
import { apiFetch } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const selected = versions.find((item) => item.selected) ?? versions[0];

  const loadChatMessages = useCallback(async (resolvedProjectId: string) => {
    const data = await apiFetch<{ messages: Array<{ id: string; role: string; content: string; timestamp: string }> }>(
      `/projects/${resolvedProjectId}/chat/positioning`
    );
    if (data?.messages) {
      setMessages(
        data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          timestamp: new Date(m.timestamp)
        }))
      );
    }
  }, []);

  const saveChatMessages = useCallback(
    async (newMessages: Message[]) => {
      if (!projectId) return;
      const existingIds = new Set(messages.map((m) => m.id));
      const toSave = newMessages.filter((m) => !existingIds.has(m.id) || m.id.includes("-"));

      if (toSave.length > 0) {
        await apiFetch(`/projects/${projectId}/chat/positioning`, {
          method: "POST",
          body: JSON.stringify({
            messages: toSave.map((m) => ({
              role: m.role,
              content: m.content
            }))
          })
        });
      }
      setMessages(newMessages);
    },
    [projectId, messages]
  );

  const loadVersions = useCallback(async (resolvedProjectId: string) => {
    const data = await apiFetch<{ versions?: PositioningVersion[] }>(
      `/projects/${resolvedProjectId}/positioning`
    );
    if (!data) throw new Error("Failed to load positioning versions");
    setVersions((data.versions ?? []).filter((item) => item.id));
    await loadChatMessages(resolvedProjectId);
  }, [loadChatMessages]);

  const load = useCallback(async () => {
    if (!projectSlug) return;
    setLoading(true);
    setError(null);
    try {
      const projects = await apiFetch<ProjectRow[]>("/projects");
      if (!projects) throw new Error("Failed to load projects");
      const project = projects.find((item) => item.slug === projectSlug);
      if (!project) throw new Error("Project not found for this slug");
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

  const handleSend = useCallback(
    async (message: string, mode: string): Promise<string | null> => {
      if (!projectId) return null;
      setRunning(true);
      setError(null);

      try {
        const endpoint = message.toLowerCase().includes("run") ? "run" : "advise";
        const data = await apiFetch<{ agent_trace?: Record<string, unknown> }>(
          `/projects/${projectId}/positioning/${endpoint}`,
          {
            method: "POST",
            body: JSON.stringify({
              advice: message,
              mode
            })
          }
        );

        if (!data) throw new Error(`Positioning ${endpoint} failed`);
        await loadVersions(projectId);

        const newVersions = versions.length;
        return `I've generated positioning options based on your guidance. ${newVersions > 0 ? `You now have **${newVersions} versions** to choose from.` : ""} Review them in the panel and select the one that fits best.`;
      } catch (runError) {
        setError(runError instanceof Error ? runError.message : "Failed to run positioning");
        return "I encountered an error while processing. Please try again.";
      } finally {
        setRunning(false);
      }
    },
    [loadVersions, projectId, versions.length]
  );

  const selectVersion = useCallback(
    async (versionId: string) => {
      if (!projectId) return;
      setError(null);
      try {
        const result = await apiFetch(`/projects/${projectId}/positioning/select/${versionId}`, {
          method: "POST"
        });
        if (result === null) throw new Error("Failed to select positioning version");
        await loadVersions(projectId);
      } catch (selectError) {
        setError(
          selectError instanceof Error ? selectError.message : "Failed to select positioning version"
        );
      }
    },
    [loadVersions, projectId]
  );

  const continueHref = useMemo(() => `/app/projects/${projectSlug}/execution`, [projectSlug]);

  const quickActions = [
    {
      label: "Generate positioning options with ICP, wedge, and messaging strategy",
      message: "Generate multiple positioning options including ideal customer profile definition, competitive wedge, and core messaging strategy"
    },
    {
      label: "Refine the ICP to focus on highest-value customer segments",
      message: "Help me narrow down the ideal customer profile to focus on the customer segments with the highest willingness to pay and fastest sales cycles"
    },
    {
      label: "Develop objection handling and competitive differentiation",
      message: "What objections might customers have about our positioning and how can we address them while strengthening our competitive differentiation?"
    }
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-fg-muted">Loading positioning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Positioning Agent</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Craft your ICP, wedge, and messaging through conversation.
          </p>
        </div>
        <Link
          href={continueHref}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue to Execution
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main Layout */}
      <div className="grid h-[calc(100vh-280px)] min-h-[500px] gap-4 lg:grid-cols-2">
        {/* Chat Panel */}
        <div className="overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
          <AgentChat
            agentName="Positioning Agent"
            agentDescription="ICP definition & messaging strategy"
            placeholder="Describe your target customer, refine positioning, explore messaging angles..."
            onSend={handleSend}
            isProcessing={running}
            messages={messages}
            onMessagesChange={saveChatMessages}
            quickActions={quickActions}
          />
        </div>

        {/* Insights Panel */}
        <div className="overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
          <InsightPanel
            title="Positioning Versions"
            subtitle={`${versions.length} version${versions.length !== 1 ? "s" : ""} generated`}
          >
            {/* Selected Preview */}
            {selected && (
              <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-purple-500/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                    Selected
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-fg-primary">
                  {selected.headline || "Untitled"}
                </h4>
                {selected.subheadline && (
                  <p className="mt-1 text-sm text-fg-secondary">{selected.subheadline}</p>
                )}
                {selected.positioning_statement && (
                  <p className="mt-3 border-l-2 border-accent/30 pl-3 text-sm italic text-fg-muted">
                    {selected.positioning_statement}
                  </p>
                )}
                {selected.benefits && selected.benefits.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {selected.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-fg-secondary">
                        <svg
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {benefit}
                      </div>
                    ))}
                  </div>
                )}
                {selected.pricing_direction && (
                  <div className="mt-4 rounded-lg bg-surface-elevated p-3">
                    <p className="text-xs font-medium text-fg-muted">Pricing Direction</p>
                    <p className="mt-1 text-sm text-fg-primary">{selected.pricing_direction}</p>
                  </div>
                )}
              </div>
            )}

            {/* Version List */}
            <InsightSection
              title="All Versions"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              }
              count={versions.length}
              accentColor="purple"
            >
              {versions.length === 0 ? (
                <InsightEmpty message="No positioning versions yet" />
              ) : (
                <div className="space-y-2">
                  {versions.map((version, i) => (
                    <button
                      key={version.id}
                      onClick={() => selectVersion(version.id)}
                      className={`block w-full rounded-lg border p-3 text-left transition-all ${
                        version.selected
                          ? "border-accent bg-accent/5"
                          : "border-edge-subtle bg-surface-elevated hover:border-edge-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-fg-primary truncate">
                            {version.icp}
                          </p>
                          <p className="mt-0.5 text-xs text-fg-muted truncate">{version.wedge}</p>
                        </div>
                        {version.selected && (
                          <svg
                            className="h-5 w-5 flex-shrink-0 text-accent"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </InsightSection>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <InsightCard
                title="ICP Defined"
                value={selected?.icp ? "Yes" : "No"}
                icon={
                  selected?.icp ? (
                    <svg
                      className="h-4 w-4 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : undefined
                }
              />
              <InsightCard
                title="Benefits"
                value={selected?.benefits?.length ?? 0}
                icon={
                  <svg
                    className="h-4 w-4 text-fg-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
            </div>
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
