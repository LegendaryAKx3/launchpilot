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
import { isLocalMessageId, mergeSavedMessages } from "@/lib/agent-chat";

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
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const loadChatMessages = useCallback(async (resolvedProjectId: string) => {
    const data = await apiFetch<{ messages: Array<{ id: string; role: string; content: string; timestamp: string }> }>(
      `/projects/${resolvedProjectId}/chat/research`
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
      if (!projectId) return newMessages;
      const toSave = newMessages.filter((m) => isLocalMessageId(m.id));

      if (toSave.length > 0) {
        const saved = await apiFetch<{ messages: Array<{ id: string; role: string; content: string; timestamp: string }> }>(
          `/projects/${projectId}/chat/research`,
          {
          method: "POST",
          body: JSON.stringify({
            messages: toSave.map((m) => ({
              role: m.role,
              content: m.content
            }))
          })
          }
        );
        const merged = mergeSavedMessages(newMessages, saved?.messages ?? []);
        setMessages(merged);
        return merged;
      }
      setMessages(newMessages);
      return newMessages;
    },
    [projectId]
  );

  const loadSnapshot = useCallback(async (resolvedProjectId: string) => {
    const data = await apiFetch<ResearchState>(`/projects/${resolvedProjectId}/research`);
    if (!data) {
      throw new Error("Failed to load research snapshot");
    }
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

  const handleSend = useCallback(
    async (message: string, mode: string): Promise<string | null> => {
      if (!projectId) return null;
      setRunning(true);
      setError(null);

      try {
        const endpoint = message.toLowerCase().includes("run") ? "run" : "advise";
        const data = await apiFetch<{
          agent_trace?: Record<string, unknown>;
          run?: { status?: string; summary?: string };
          competitors?: Array<{ name: string; positioning?: string; pricing_summary?: string }>;
          pain_point_clusters?: Array<{ label: string; description?: string; rank?: number }>;
          opportunity_wedges?: Array<{
            id?: string;
            label: string;
            description?: string;
            score?: number;
          }>;
          chat_message?: string;
          next_step_suggestion?: string;
          should_move_to_next_stage?: boolean;
          next_stage?: string;
        }>(`/projects/${projectId}/research/${endpoint}`, {
          method: "POST",
          body: JSON.stringify({
            advice: message,
            mode
          })
        });

        if (!data) throw new Error(`Research ${endpoint} failed`);

        setState({
          run: data.run,
          competitors: data.competitors ?? [],
          pain_point_clusters: data.pain_point_clusters ?? [],
          opportunity_wedges: data.opportunity_wedges ?? []
        });

        const stageGuidance =
          data.next_step_suggestion ||
          (data.should_move_to_next_stage
            ? "Research looks complete. Move to Positioning and choose the wedge you want to execute."
            : "Continue refining research with one focused follow-up question.");

        if (data.chat_message?.trim()) {
          return `${data.chat_message.trim()}\n\n**Next step:** ${stageGuidance}`;
        }

        // Fallback response synthesis if chat_message was not returned
        const parts: string[] = [];
        if (data.run?.summary) {
          parts.push(data.run.summary);
        }
        if (data.competitors && data.competitors.length > 0) {
          parts.push(`\n\nI found **${data.competitors.length} competitors** to analyze.`);
        }
        if (data.pain_point_clusters && data.pain_point_clusters.length > 0) {
          parts.push(`Identified **${data.pain_point_clusters.length} pain point clusters**.`);
        }
        if (data.opportunity_wedges && data.opportunity_wedges.length > 0) {
          const topWedge = data.opportunity_wedges[0];
          parts.push(
            `\n\nTop opportunity: **${topWedge.label}**${topWedge.score ? ` (score: ${topWedge.score})` : ""}`
          );
        }

        const fallback = parts.join(" ") || "Research analysis complete. Check the insights panel for details.";
        return `${fallback}\n\n**Next step:** ${stageGuidance}`;
      } catch (runError) {
        setError(runError instanceof Error ? runError.message : "Failed to run research");
        return "I encountered an error while processing. Please try again.";
      } finally {
        setRunning(false);
      }
    },
    [projectId]
  );

  const continueHref = useMemo(() => `/app/projects/${projectSlug}/positioning`, [projectSlug]);

  const quickActions = [
    {
      label: "Run comprehensive market research to identify competitors, pain points, and opportunities",
      message: "Run a comprehensive market research analysis covering competitor landscape, customer pain points, and strategic opportunity wedges"
    },
    {
      label: "Deep dive into competitor positioning and pricing strategies",
      message: "Analyze competitor positioning statements, value propositions, and pricing models to find gaps we can exploit"
    },
    {
      label: "Identify underserved customer segments and their biggest frustrations",
      message: "Research underserved customer segments in this market and identify their most pressing pain points that aren't being addressed"
    }
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-fg-muted">Loading research...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Research Agent</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Have a conversation to guide market research and competitive analysis.
          </p>
        </div>
        <Link
          href={continueHref}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue to Positioning
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
            agentName="Research Agent"
            agentDescription="Market research & competitive analysis"
            placeholder="Ask about competitors, pain points, market opportunities..."
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
            title="Research Insights"
            subtitle={state.run?.status ? `Status: ${state.run.status}` : "Run research to generate insights"}
          >
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <InsightCard title="Competitors" value={state.competitors.length} />
              <InsightCard title="Pain Points" value={state.pain_point_clusters.length} />
              <InsightCard title="Wedges" value={state.opportunity_wedges.length} />
            </div>

            {/* Competitors */}
            <InsightSection
              title="Competitors"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              count={state.competitors.length}
              accentColor="blue"
            >
              {state.competitors.length === 0 ? (
                <InsightEmpty message="No competitors found yet" />
              ) : (
                <div className="space-y-2">
                  {state.competitors.map((comp, i) => (
                    <InsightListItem
                      key={`${comp.name}-${i}`}
                      title={comp.name}
                      description={comp.positioning}
                      badge={comp.pricing_summary}
                      badgeColor="blue"
                    />
                  ))}
                </div>
              )}
            </InsightSection>

            {/* Pain Points */}
            <InsightSection
              title="Pain Points"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              count={state.pain_point_clusters.length}
              accentColor="amber"
            >
              {state.pain_point_clusters.length === 0 ? (
                <InsightEmpty message="No pain points identified yet" />
              ) : (
                <div className="space-y-2">
                  {state.pain_point_clusters.map((pain, i) => (
                    <InsightListItem
                      key={`${pain.label}-${i}`}
                      title={pain.label}
                      description={pain.description}
                      badge={pain.rank ? `#${pain.rank}` : undefined}
                      badgeColor={pain.rank && pain.rank <= 2 ? "red" : "amber"}
                    />
                  ))}
                </div>
              )}
            </InsightSection>

            {/* Opportunity Wedges */}
            <InsightSection
              title="Opportunity Wedges"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              count={state.opportunity_wedges.length}
              accentColor="emerald"
            >
              {state.opportunity_wedges.length === 0 ? (
                <InsightEmpty message="No wedges discovered yet" />
              ) : (
                <div className="space-y-2">
                  {state.opportunity_wedges.map((wedge, i) => (
                    <InsightListItem
                      key={`${wedge.id ?? wedge.label}-${i}`}
                      title={wedge.label}
                      description={wedge.description}
                      badge={`#${i + 1}`}
                      badgeColor="emerald"
                    />
                  ))}
                </div>
              )}
            </InsightSection>
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
