"use client";

import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgentChat, AgentChatResponse } from "@/components/chat/agent-chat";
import { Message } from "@/components/chat/chat-message";
import { apiFetch } from "@/lib/api";
import { createLocalMessageId, isLocalMessageId, mergeSavedMessages } from "@/lib/agent-chat";

interface ProjectRow {
  id: string;
  slug: string;
}

type ChatAgentTarget = "auto" | "research" | "positioning" | "plan" | "assets" | "outreach";

const quickActionsByPage: Record<string, Array<{ label: string; message: string }>> = {
  research: [
    {
      label: "Run full agent pipeline",
      message: "Run a full pipeline across all agents: research, positioning, execution plan, distribution assets, and outreach prep"
    },
    {
      label: "Run market research",
      message: "Run a comprehensive market research analysis covering competitors, customer pain points, and opportunity wedges"
    }
  ],
  positioning: [
    {
      label: "Run full agent pipeline",
      message: "Run a full pipeline across all agents: research, positioning, execution plan, distribution assets, and outreach prep"
    },
    {
      label: "Generate positioning options",
      message: "Generate positioning options with ICP, wedge, positioning statement, and messaging recommendations"
    }
  ],
  execution: [
    {
      label: "Run full agent pipeline",
      message: "Run a full pipeline across all agents: research, positioning, execution plan, distribution assets, and outreach prep"
    },
    {
      label: "Generate distribution assets",
      message: "Generate cold DMs, cold emails, image ad prompts, and video scripts with 3 variations each"
    }
  ]
};

export function ProjectGroupChat() {
  const params = useParams<{ projectSlug: string }>();
  const pathname = usePathname();
  const projectSlug = params.projectSlug;
  const [projectId, setProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const contextPage = useMemo(() => {
    if (pathname.includes("/research")) return "research";
    if (pathname.includes("/positioning")) return "positioning";
    return "execution";
  }, [pathname]);

  const quickActions = quickActionsByPage[contextPage] ?? [];

  const loadChatMessages = useCallback(async (resolvedProjectId: string) => {
    const data = await apiFetch<{ messages: Array<{ id: string; role: string; content: string; timestamp: string; metadata?: Record<string, unknown> }> }>(
      `/projects/${resolvedProjectId}/chat/group`
    );
    if (data?.messages) {
      setMessages(
        data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          timestamp: new Date(m.timestamp),
          metadata: m.metadata
        }))
      );
    }
  }, []);

  const saveChatMessages = useCallback(
    async (newMessages: Message[]) => {
      if (!projectId) return newMessages;
      const toSave = newMessages.filter((m) => isLocalMessageId(m.id));
      if (toSave.length > 0) {
        const saved = await apiFetch<{ messages: Array<{ id: string; role: string; content: string; timestamp: string; metadata?: Record<string, unknown> }> }>(
          `/projects/${projectId}/chat/group`,
          {
            method: "POST",
            body: JSON.stringify({
              messages: toSave.map((m) => ({
                role: m.role,
                content: m.content,
                metadata: m.metadata ?? null
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

  const load = useCallback(async () => {
    if (!projectSlug) return;
    const projects = await apiFetch<ProjectRow[]>("/projects");
    if (!projects) return;
    const project = projects.find((item) => item.slug === projectSlug);
    if (!project) return;
    setProjectId(project.id);
    await loadChatMessages(project.id);
  }, [loadChatMessages, projectSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!projectId) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void loadChatMessages(projectId);
    };
    const interval = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadChatMessages, projectId]);

  const appendSystemError = useCallback(async (text: string, currentMessages: Message[]) => {
    const systemMessage: Message = {
      id: createLocalMessageId("system"),
      role: "system",
      content: text,
      timestamp: new Date()
    };
    await saveChatMessages([...currentMessages, systemMessage]);
  }, [saveChatMessages]);

  const handleSend = useCallback(async (message: string, mode: string, selectedAgent: string): Promise<string | AgentChatResponse | null> => {
    if (!projectId) return null;
    const target = (selectedAgent || "auto") as ChatAgentTarget;
    const lower = message.toLowerCase();
    setRunningAction(target);

    const setExecutionFocus = (
      tab: "plan" | "assets" | "outreach",
      outreachSubTab?: "contacts" | "batches"
    ) => {
      window.dispatchEvent(new CustomEvent("execution:focus-tab", { detail: { tab, outreachSubTab } }));
    };

    try {
      const isFullPipelineRequest =
        target === "auto" &&
        (lower.includes("full pipeline") ||
          lower.includes("all agents") ||
          lower.includes("end-to-end") ||
          lower.includes("across all agents"));

      if (isFullPipelineRequest) {
        const researchAdvice = [
          "Run market research for this project and produce:",
          "1) top competitors with positioning clues,",
          "2) top customer pain points,",
          "3) highest-value opportunity wedges.",
          "4) outreach contacts that are directly relevant to the offer and ICP.",
          "Use real business domains and avoid speculative/fabricated contact details.",
          `User objective/context: ${message}`
        ].join(" ");
        const researchData = await apiFetch<{ chat_message?: string }>(
          `/projects/${projectId}/research/advise`,
          { method: "POST", body: JSON.stringify({ advice: researchAdvice, mode }) }
        );

        const positioningAdvice = [
          "Using the latest research context, generate strong positioning options with:",
          "ICP definition, competitive wedge, core positioning statement, headline/subheadline, and value framing.",
          "Bias for clear differentiation and strong willingness-to-pay segments.",
          `User objective/context: ${message}`,
          `Research summary: ${researchData?.chat_message?.trim() || "N/A"}`
        ].join(" ");
        const positioningData = await apiFetch<{ chat_message?: string }>(
          `/projects/${projectId}/positioning/advise`,
          { method: "POST", body: JSON.stringify({ advice: positioningAdvice, mode }) }
        );

        const planAdvice = [
          "Create an execution plan from current positioning/research context.",
          "Focus on practical, high-leverage launch steps and measurable outcomes.",
          `User objective/context: ${message}`,
          `Positioning summary: ${positioningData?.chat_message?.trim() || "N/A"}`
        ].join(" ");
        const planData = await apiFetch<{ chat_message?: string }>(
          `/projects/${projectId}/execution/plan/advise`,
          { method: "POST", body: JSON.stringify({ advice: planAdvice, mode }) }
        );

        const assetAdvice = [
          "Generate distribution assets aligned with the latest positioning and plan.",
          "Create compelling channel-ready variants for outbound acquisition.",
          `User objective/context: ${message}`,
          `Execution summary: ${planData?.chat_message?.trim() || "N/A"}`
        ].join(" ");
        const assetsData = await apiFetch<{ chat_message?: string; assets?: Array<{ id: string }> }>(
          `/projects/${projectId}/execution/distribution-assets`,
          {
            method: "POST",
            body: JSON.stringify({
              channels: null,
              variations_per_channel: 3,
              advice: assetAdvice,
              mode
            })
          }
        );

        const outreachAdvice = [
          "Prepare an outreach email batch using the latest strategy and generated assets.",
          "Prioritize clarity, personalization placeholders, and direct CTA language.",
          `User objective/context: ${message}`,
          `Assets summary: ${assetsData?.chat_message?.trim() || `${assetsData?.assets?.length ?? 0} assets generated`}`
        ].join(" ");
        const outreachData = await apiFetch<{ chat_message?: string; prepared?: boolean }>(
          `/projects/${projectId}/execution/email-batch/prepare/advise`,
          {
            method: "POST",
            body: JSON.stringify({
              subject_line: null,
              max_contacts: 25,
              advice: outreachAdvice,
              mode
            })
          }
        );

        setExecutionFocus("outreach", "batches");

        const lines = [
          "**Full pipeline run completed**",
          `Research: ${researchData?.chat_message?.trim() || "updated"}`,
          `Positioning: ${positioningData?.chat_message?.trim() || "updated"}`,
          `Execution Plan: ${planData?.chat_message?.trim() || "updated"}`,
          `Assets: ${assetsData?.assets?.length ? `generated ${assetsData.assets.length} variations` : (assetsData?.chat_message?.trim() || "updated")}`,
          `Outreach: ${outreachData?.prepared ? "email batch prepared" : (outreachData?.chat_message?.trim() || "updated")}`
        ];

        return { content: lines.join("\n"), agentLabel: "Auto Router -> Full Pipeline" };
      }

      if (target === "research") {
        const endpoint = lower.includes("run") ? "run" : "advise";
        const data = await apiFetch<{ chat_message?: string; next_step_suggestion?: string }>(
          `/projects/${projectId}/research/${endpoint}`,
          { method: "POST", body: JSON.stringify({ advice: message, mode }) }
        );
        return { content: data?.chat_message?.trim() || data?.next_step_suggestion || "Research updated.", agentLabel: "Research Agent" };
      }

      if (target === "positioning") {
        const endpoint = lower.includes("run") ? "run" : "advise";
        const data = await apiFetch<{ chat_message?: string; next_step_suggestion?: string }>(
          `/projects/${projectId}/positioning/${endpoint}`,
          { method: "POST", body: JSON.stringify({ advice: message, mode }) }
        );
        return { content: data?.chat_message?.trim() || data?.next_step_suggestion || "Positioning updated.", agentLabel: "Positioning Agent" };
      }

      if (target === "plan") {
        const data = await apiFetch<{ chat_message?: string }>(
          `/projects/${projectId}/execution/plan/advise`,
          { method: "POST", body: JSON.stringify({ advice: message, mode }) }
        );
        setExecutionFocus("plan");
        return { content: data?.chat_message?.trim() || "Plan updated with your daily targets.", agentLabel: "Plan Agent" };
      }

      if (target === "assets") {
        const data = await apiFetch<{ chat_message?: string; assets?: Array<{ id: string }>; testing_strategy?: string }>(
          `/projects/${projectId}/execution/distribution-assets`,
          {
            method: "POST",
            body: JSON.stringify({
              channels: null,
              variations_per_channel: 3,
              advice: message,
              mode
            })
          }
        );
        setExecutionFocus("assets");
        const count = data?.assets?.length ?? 0;
        const suffix = count > 0 ? `\n\nGenerated ${count} asset variations.${data?.testing_strategy ? ` ${data.testing_strategy}` : ""}` : "";
        return { content: (data?.chat_message?.trim() || "Assets generated.") + suffix, agentLabel: "Assets Agent" };
      }

      if (target === "outreach") {
        const data = await apiFetch<{ chat_message?: string; prepared?: boolean }>(
          `/projects/${projectId}/execution/email-batch/prepare/advise`,
          {
            method: "POST",
            body: JSON.stringify({
              subject_line: null,
              max_contacts: 10,
              advice: message,
              mode
            })
          }
        );
        setExecutionFocus("outreach", "batches");
        return {
          content: (data?.chat_message?.trim() || "Outreach preparation complete.") + (data?.prepared ? "\n\nEmail batch ready for review in the Outreach tab." : ""),
          agentLabel: "Outreach Agent"
        };
      }

      const isContactGenerationRequest =
        lower.includes("generate contacts") ||
        lower.includes("find contacts") ||
        lower.includes("source contacts") ||
        lower.includes("find leads") ||
        lower.includes("lead list") ||
        lower.includes("prospects") ||
        lower.includes("lead generation") ||
        lower.includes("find emails") ||
        lower.includes("get emails") ||
        lower.includes("get contacts") ||
        lower.includes("email list") ||
        lower.includes("contact list") ||
        lower.includes("who should i reach") ||
        lower.includes("who to reach") ||
        lower.includes("reach out to") ||
        lower.includes("outreach list") ||
        lower.includes("target companies") ||
        lower.includes("target list") ||
        lower.includes("build a list") ||
        lower.includes("scrape") ||
        lower.includes("enrich leads") ||
        lower.includes("find companies");

      if (isContactGenerationRequest) {
        const contactAdvice = [
          "Generate a high-volume list of outreach contacts relevant to this project's offer.",
          "Prioritize companies and roles with clear problem-fit for the service.",
          "Only include business emails/domains that look valid and plausible.",
          "Avoid generic unrelated companies; if uncertain, prefer fewer but relevant contacts.",
          `User objective/context: ${message}`
        ].join(" ");
        const data = await apiFetch<{
          chat_message?: string;
          contacts_upserted?: Array<{ email?: string; company?: string }>;
          lead_pipeline?: { status?: string; message?: string };
        }>(
          `/projects/${projectId}/research/run`,
          { method: "POST", body: JSON.stringify({ advice: contactAdvice, mode }) }
        );
        setExecutionFocus("outreach", "contacts");
        const seededCount = Array.isArray(data?.contacts_upserted) ? data!.contacts_upserted.length : 0;
        const withEmail = Array.isArray(data?.contacts_upserted) ? data!.contacts_upserted.filter((c) => c.email).length : 0;
        const companyOnly = seededCount - withEmail;
        const parts = [data?.chat_message?.trim() || "Contact generation started."];
        if (seededCount > 0) {
          parts.push(`\n\n${seededCount} contacts seeded initially.`);
          if (withEmail > 0) parts.push(`${withEmail} with emails.`);
          if (companyOnly > 0) parts.push(`${companyOnly} companies listed (no valid email found).`);
        }
        parts.push("\n\nThe lead pipeline is running in the background — more contacts will appear shortly. Check the Contacts tab in a few seconds.");
        return {
          content: parts.join(" "),
          agentLabel: "Auto Router -> Contact Pipeline"
        };
      }

      if (lower.includes("competitor") || lower.includes("market") || lower.includes("research")) {
        const data = await apiFetch<{ chat_message?: string }>(
          `/projects/${projectId}/research/advise`,
          { method: "POST", body: JSON.stringify({ advice: message, mode }) }
        );
        return { content: data?.chat_message?.trim() || "Research updated.", agentLabel: "Auto Router -> Research" };
      }
      if (lower.includes("icp") || lower.includes("positioning") || lower.includes("wedge")) {
        const data = await apiFetch<{ chat_message?: string }>(
          `/projects/${projectId}/positioning/advise`,
          { method: "POST", body: JSON.stringify({ advice: message, mode }) }
        );
        return { content: data?.chat_message?.trim() || "Positioning updated.", agentLabel: "Auto Router -> Positioning" };
      }
      if (lower.includes("email batch") || lower.includes("outreach")) {
        const data = await apiFetch<{ chat_message?: string; prepared?: boolean }>(
          `/projects/${projectId}/execution/email-batch/prepare/advise`,
          {
            method: "POST",
            body: JSON.stringify({
              subject_line: null,
              max_contacts: 10,
              advice: message,
              mode
            })
          }
        );
        setExecutionFocus("outreach", "batches");
        return { content: data?.chat_message?.trim() || "Outreach updated.", agentLabel: "Auto Router -> Outreach" };
      }
      if (lower.includes("asset") || lower.includes("copy") || lower.includes("video") || lower.includes("dm")) {
        const data = await apiFetch<{ chat_message?: string; assets?: Array<{ id: string }> }>(
          `/projects/${projectId}/execution/distribution-assets`,
          {
            method: "POST",
            body: JSON.stringify({
              channels: null,
              variations_per_channel: 3,
              advice: message,
              mode
            })
          }
        );
        setExecutionFocus("assets");
        return { content: data?.chat_message?.trim() || "Assets generated.", agentLabel: "Auto Router -> Assets" };
      }

      const planData = await apiFetch<{ chat_message?: string }>(
        `/projects/${projectId}/execution/plan/advise`,
        { method: "POST", body: JSON.stringify({ advice: message, mode }) }
      );
      setExecutionFocus("plan");
      return { content: planData?.chat_message?.trim() || "Plan updated with your daily targets.", agentLabel: "Auto Router -> Plan" };
    } catch {
      await appendSystemError("Request failed. Please try again.", messages);
      return null;
    } finally {
      setRunningAction(null);
    }
  }, [appendSystemError, messages, projectId]);

  return (
    <div className="h-full overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
      <AgentChat
        agentName="Project Group Chat"
        agentDescription="One chat routing to research, positioning, and execution agents"
        placeholder="Ask anything about research, positioning, assets, outreach, or execution planning..."
        onSend={handleSend}
        isProcessing={runningAction !== null}
        messages={messages}
        onMessagesChange={saveChatMessages}
        agentOptions={[
          { value: "auto", label: "Auto" },
          { value: "research", label: "Research Agent" },
          { value: "positioning", label: "Positioning Agent" },
          { value: "plan", label: "Plan Agent" },
          { value: "assets", label: "Assets Agent" },
          { value: "outreach", label: "Outreach Agent" }
        ]}
        quickActions={quickActions}
      />
    </div>
  );
}
