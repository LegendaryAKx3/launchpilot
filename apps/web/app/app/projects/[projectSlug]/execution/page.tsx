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

interface ExecutionState {
  plans: Array<{ id: string }>;
  tasks: Array<{ id: string; day_number?: number; title: string; status?: string }>;
  assets: Array<{ id: string; title?: string; asset_type: string; status: string; content?: string }>;
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
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const loadChatMessages = useCallback(async (resolvedProjectId: string) => {
    const data = await apiFetch<{ messages: Array<{ id: string; role: string; content: string; timestamp: string }> }>(
      `/projects/${resolvedProjectId}/chat/execution`
    );
    if (data?.messages) {
      setChatMessages(
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
      const existingIds = new Set(chatMessages.map((m) => m.id));
      const toSave = newMessages.filter((m) => !existingIds.has(m.id) || m.id.includes("-"));

      if (toSave.length > 0) {
        await apiFetch(`/projects/${projectId}/chat/execution`, {
          method: "POST",
          body: JSON.stringify({
            messages: toSave.map((m) => ({
              role: m.role,
              content: m.content
            }))
          })
        });
      }
      setChatMessages(newMessages);
    },
    [projectId, chatMessages]
  );

  const loadState = useCallback(async (resolvedProjectId: string) => {
    const data = await apiFetch<ExecutionState>(`/projects/${resolvedProjectId}/execution/state`);
    if (!data) throw new Error("Failed to load execution state");
    setState(data);
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

  const handleSend = useCallback(
    async (message: string, mode: string): Promise<string | null> => {
      if (!projectId) return null;

      const lowerMessage = message.toLowerCase();
      let action = "plan";
      let path = "plan/advise";
      let body: Record<string, unknown> = { advice: message, mode };

      if (lowerMessage.includes("asset") || lowerMessage.includes("content") || lowerMessage.includes("copy")) {
        action = "assets";
        path = "assets/advise";
        body = {
          types: ["landing_copy", "email_copy"],
          count: 1,
          advice: message,
          mode
        };
      } else if (lowerMessage.includes("email") || lowerMessage.includes("outreach") || lowerMessage.includes("contact")) {
        action = "outreach";
        path = "email-batch/prepare/advise";
        body = {
          subject_line: null,
          max_contacts: 10,
          advice: message,
          mode
        };
      }

      setRunningAction(action);
      setError(null);

      try {
        const data = await apiFetch<{ agent_trace?: Record<string, unknown> }>(
          `/projects/${projectId}/execution/${path}`,
          {
            method: "POST",
            body: JSON.stringify(body)
          }
        );

        if (!data) throw new Error(`Failed action: ${action}`);
        await loadState(projectId);

        const responses: Record<string, string> = {
          plan: `I've updated the execution plan based on your guidance. You now have **${state.tasks.length} tasks** across 7 days.`,
          assets: `I've generated new assets for you. Check the Assets section in the panel to review them.`,
          outreach: `Outreach batch prepared. Review and approve it before sending.`
        };

        return responses[action] || "Action completed. Check the panel for updates.";
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Failed execution action");
        return "I encountered an error. Please try again.";
      } finally {
        setRunningAction(null);
      }
    },
    [loadState, projectId, state.tasks.length]
  );

  const addContact = useCallback(
    async (name: string, email: string) => {
      if (!projectId || !email.trim()) return;
      setRunningAction("add-contact");
      try {
        const result = await apiFetch(`/projects/${projectId}/execution/contacts`, {
          method: "POST",
          body: JSON.stringify({
            contacts: [{ name: name.trim() || null, email: email.trim(), segment: "manual" }]
          })
        });
        if (result === null) throw new Error("Failed to add contact");
        await loadState(projectId);
      } catch {
        setError("Failed to add contact");
      } finally {
        setRunningAction(null);
      }
    },
    [loadState, projectId]
  );

  const quickActions = [
    {
      label: "Create a detailed 7-day launch plan with daily tasks and milestones",
      message: "Create a comprehensive 7-day execution plan for launch including daily tasks, key milestones, and dependencies between activities"
    },
    {
      label: "Generate landing page copy, headlines, and key benefit statements",
      message: "Generate compelling landing page copy including headline variations, subheadlines, benefit statements, and calls to action"
    },
    {
      label: "Prepare personalized email outreach sequence for target contacts",
      message: "Create a personalized email outreach sequence with subject lines, body copy, and follow-up templates for the contact list"
    }
  ];

  const tasksByDay = useMemo(() => {
    const grouped: Record<number, typeof state.tasks> = {};
    state.tasks.forEach((task) => {
      const day = task.day_number ?? 1;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(task);
    });
    return grouped;
  }, [state.tasks]);

  const pendingBatches = state.batches.filter((b) => b.status === "pending_approval");
  const completedTasks = state.tasks.filter(
    (t) => t.status === "completed" || t.status === "succeeded"
  ).length;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-fg-muted">Loading execution...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Execution Agent</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Plan, create assets, and manage outreach through conversation.
          </p>
        </div>
        <Link
          href={`/app/projects/${projectSlug}/approvals`}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          {pendingBatches.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              {pendingBatches.length}
            </span>
          )}
          Review Approvals
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
            agentName="Execution Agent"
            agentDescription="Launch planning & asset generation"
            placeholder="Plan your launch, generate content, set up outreach..."
            onSend={handleSend}
            isProcessing={runningAction !== null}
            messages={chatMessages}
            onMessagesChange={saveChatMessages}
            quickActions={quickActions}
          />
        </div>

        {/* Insights Panel */}
        <div className="overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
          <InsightPanel
            title="Execution Dashboard"
            subtitle={`${completedTasks}/${state.tasks.length} tasks completed`}
          >
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2">
              <InsightCard title="Tasks" value={state.tasks.length} />
              <InsightCard title="Assets" value={state.assets.length} />
              <InsightCard title="Contacts" value={state.contacts.length} />
              <InsightCard
                title="Pending"
                value={pendingBatches.length}
                trend={pendingBatches.length > 0 ? "up" : "neutral"}
              />
            </div>

            {/* 7-Day Plan */}
            <InsightSection
              title="7-Day Plan"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
              count={state.tasks.length}
              accentColor="blue"
            >
              {state.tasks.length === 0 ? (
                <InsightEmpty message="No plan created yet" />
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div key={day}>
                      <p className="mb-1.5 text-xs font-medium text-fg-muted">Day {day}</p>
                      {tasksByDay[day]?.length > 0 ? (
                        <div className="space-y-1">
                          {tasksByDay[day].map((task) => (
                            <div
                              key={task.id}
                              className={`flex items-center gap-2 rounded-lg border border-edge-subtle px-3 py-2 text-sm ${
                                task.status === "completed" || task.status === "succeeded"
                                  ? "bg-emerald-500/5 text-emerald-400"
                                  : "bg-surface-elevated text-fg-secondary"
                              }`}
                            >
                              {task.status === "completed" || task.status === "succeeded" ? (
                                <svg
                                  className="h-4 w-4 flex-shrink-0"
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
                              ) : (
                                <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-edge-muted" />
                              )}
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-fg-faint">No tasks</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </InsightSection>

            {/* Assets */}
            <InsightSection
              title="Generated Assets"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              count={state.assets.length}
              accentColor="purple"
            >
              {state.assets.length === 0 ? (
                <InsightEmpty message="No assets generated yet" />
              ) : (
                <div className="space-y-2">
                  {state.assets.map((asset) => (
                    <InsightListItem
                      key={asset.id}
                      title={asset.title ?? asset.asset_type}
                      description={asset.asset_type}
                      badge={asset.status}
                      badgeColor={asset.status === "ready" ? "emerald" : "amber"}
                      onClick={() => setSelectedAsset(selectedAsset === asset.id ? null : asset.id)}
                    />
                  ))}
                </div>
              )}
            </InsightSection>

            {/* Contacts */}
            <InsightSection
              title="Contacts"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
              count={state.contacts.length}
              accentColor="emerald"
              defaultOpen={false}
            >
              {state.contacts.length === 0 ? (
                <InsightEmpty message="No contacts added yet" />
              ) : (
                <div className="space-y-2">
                  {state.contacts.slice(0, 5).map((contact) => (
                    <InsightListItem
                      key={contact.id}
                      title={contact.name || contact.email || "Unknown"}
                      description={contact.email}
                      badge={contact.segment}
                    />
                  ))}
                  {state.contacts.length > 5 && (
                    <p className="text-center text-xs text-fg-muted">
                      +{state.contacts.length - 5} more contacts
                    </p>
                  )}
                </div>
              )}
            </InsightSection>

            {/* Action Queue */}
            {state.batches.length > 0 && (
              <InsightSection
                title="Email Batches"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                }
                count={state.batches.length}
                accentColor="amber"
              >
                <div className="space-y-2">
                  {state.batches.map((batch) => (
                    <InsightListItem
                      key={batch.id}
                      title={batch.subject_line || `Batch ${batch.id.slice(0, 8)}`}
                      description={`${batch.send_count ?? 0} recipients`}
                      badge={batch.status}
                      badgeColor={
                        batch.status === "pending_approval"
                          ? "amber"
                          : batch.status === "sent"
                            ? "emerald"
                            : "blue"
                      }
                    />
                  ))}
                </div>
              </InsightSection>
            )}
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
