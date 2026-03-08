"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgentChat } from "@/components/chat/agent-chat";
import { Message } from "@/components/chat/chat-message";
import { ExecutionTabs, ExecutionTab } from "@/components/execution/execution-tabs";
import { PlansList, PlanDetail, TaskDrawer, Plan, Task } from "@/components/execution/plans";
import { AssetsList, AssetDetail, Asset } from "@/components/execution/assets";
import {
  OutreachSubTabs,
  OutreachSubTab,
  ContactsList,
  ContactDrawer,
  BatchesList,
  BatchDetail,
  EmailPreviewModal,
  Contact,
  OutboundBatch,
  OutboundMessage
} from "@/components/execution/outreach";
import { apiFetch } from "@/lib/api";
import { isLocalMessageId, mergeSavedMessages } from "@/lib/agent-chat";

interface ProjectRow {
  id: string;
  slug: string;
}

interface ExecutionState {
  plans: Plan[];
  tasks: Task[];
  assets: Asset[];
  contacts: Contact[];
  batches: OutboundBatch[];
  messages: OutboundMessage[];
}

interface ExecutionPageState {
  activeTab: ExecutionTab;
  selectedItemId: string | null;
  outreachSubTab: OutreachSubTab;
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
  const [pageState, setPageState] = useState<ExecutionPageState>({
    activeTab: "outreach",
    selectedItemId: null,
    outreachSubTab: "batches"
  });
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Task drawer state
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Contact drawer state
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Email preview state
  const [previewingEmail, setPreviewingEmail] = useState<OutboundMessage | null>(null);

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
      if (!projectId) return newMessages;
      const toSave = newMessages.filter((m) => isLocalMessageId(m.id) && m.role === "user");

      if (toSave.length > 0) {
        const saved = await apiFetch<{ messages: Array<{ id: string; role: string; content: string; timestamp: string }> }>(
          `/projects/${projectId}/chat/execution`,
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
        setChatMessages(merged);
        return merged;
      }
      setChatMessages(newMessages);
      return newMessages;
    },
    [projectId]
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

  useEffect(() => {
    if (!projectId) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void loadState(projectId);
    };
    const interval = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadState, projectId]);

  // Chat send handler
  const handleSend = useCallback(
    async (message: string, mode: string): Promise<string | null> => {
      if (!projectId) return null;

      const lowerMessage = message.toLowerCase();
      let action = "plan";
      let path = "plan/advise";
      let body: Record<string, unknown> = { advice: message, mode };

      if (lowerMessage.includes("image ad") || lowerMessage.includes("ad image") || lowerMessage.includes("visual ad")) {
        action = "assets";
        path = "image-ad/draft";
        body = {
          advice: message,
          mode
        };
      } else if (lowerMessage.includes("asset") || lowerMessage.includes("content") || lowerMessage.includes("copy")) {
        action = "assets";
        path = "assets/advise";
        body = {
          types: ["email_copy"],
          count: 1,
          advice: message,
          mode
        };
      } else if (lowerMessage.includes("email") || lowerMessage.includes("outreach") || lowerMessage.includes("contact") || lowerMessage.includes("send")) {
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
        let data = await apiFetch<{
          agent_trace?: Record<string, unknown>;
          chat_message?: string;
          next_step_suggestion?: string;
          should_move_to_next_stage?: boolean;
          next_stage?: string;
          prepared?: boolean;
        }>(
          `/projects/${projectId}/execution/${path}`,
          {
            method: "POST",
            body: JSON.stringify(body)
          }
        );

        if (action === "assets" && path === "assets/advise") {
          await apiFetch(`/projects/${projectId}/execution/image-ad/draft`, {
            method: "POST",
            body: JSON.stringify({
              advice: message,
              mode
            })
          });
          data = data ?? {
            chat_message: "Generated email copy and an image ad prompt draft."
          };
        }

        if (!data) throw new Error(`Failed action: ${action}`);
        await loadState(projectId);
        if (action === "assets") {
          setPageState((s) => ({
            ...s,
            activeTab: "assets",
            selectedItemId: null
          }));
        }

        if (data.chat_message?.trim()) {
          return data.chat_message.trim();
        }

        const responses: Record<string, string> = {
          plan: `Plan updated! Check the Plans tab to see your tasks.`,
          assets: "Assets generated! Switch to the Assets tab to review.",
          outreach: data.prepared
            ? "Email batch ready! Review and approve it in the Outreach tab."
            : "Outreach content created."
        };

        return responses[action] || "Done! Check the panel on the right.";
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Failed execution action");
        return "Something went wrong. Please try again.";
      } finally {
        setRunningAction(null);
      }
    },
    [loadState, projectId]
  );

  // Task handlers
  const handleSaveTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      await loadState(projectId);
    },
    [projectId, loadState]
  );

  const handleToggleTask = useCallback(
    async (taskId: string) => {
      if (!projectId) return;
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const newStatus = task.status === "completed" || task.status === "succeeded" ? "pending" : "completed";
      await apiFetch(`/projects/${projectId}/execution/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      await loadState(projectId);
    },
    [projectId, state.tasks, loadState]
  );

  // Asset handlers
  const handleSaveAsset = useCallback(
    async (assetId: string, updates: Partial<Asset>) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/assets/${assetId}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      await loadState(projectId);
    },
    [projectId, loadState]
  );

  const handleAssetStatusChange = useCallback(
    async (assetId: string, status: string) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/assets/${assetId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadState(projectId);
    },
    [projectId, loadState]
  );

  const handleDeleteAsset = useCallback(
    async (assetId: string) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/assets/${assetId}`, {
        method: "DELETE"
      });
      await loadState(projectId);
      setPageState((s) => ({ ...s, selectedItemId: null }));
    },
    [projectId, loadState]
  );

  const handleGenerateImageAdDraft = useCallback(async () => {
    if (!projectId) return;
    setRunningAction("assets");
    setError(null);
    try {
      await apiFetch(`/projects/${projectId}/execution/image-ad/draft`, {
        method: "POST",
        body: JSON.stringify({
          advice: "Create a detailed image ad prompt using all known project context",
          mode: "deepen"
        })
      });
      await loadState(projectId);
      setPageState((s) => ({ ...s, activeTab: "assets" }));
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Failed to generate image ad draft");
    } finally {
      setRunningAction(null);
    }
  }, [projectId, loadState]);

  // Contact handlers
  const handleAddContact = useCallback(
    async (name: string, email: string) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/contacts`, {
        method: "POST",
        body: JSON.stringify({
          contacts: [{ name: name || null, email, segment: "manual" }]
        })
      });
      await loadState(projectId);
    },
    [projectId, loadState]
  );

  const handleSaveContact = useCallback(
    async (contactId: string, updates: Partial<Contact>) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      await loadState(projectId);
    },
    [projectId, loadState]
  );

  const handleDeleteContact = useCallback(
    async (contactId: string) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/contacts/${contactId}`, {
        method: "DELETE"
      });
      await loadState(projectId);
    },
    [projectId, loadState]
  );

  // Batch approval handlers
  const handleApproveBatch = useCallback(
    async (batchId: string) => {
      if (!projectId) return;
      const approvals = await apiFetch<Array<{ id: string; resource_id: string; status: string }>>(
        `/projects/${projectId}/approvals`
      );
      const approval = approvals?.find((a) => a.resource_id === batchId && a.status === "pending");
      if (approval) {
        await apiFetch(`/approvals/${approval.id}/approve`, {
          method: "POST",
          body: JSON.stringify({})
        });
        await loadState(projectId);
      }
    },
    [projectId, loadState]
  );

  const handleRejectBatch = useCallback(
    async (batchId: string) => {
      if (!projectId) return;
      const approvals = await apiFetch<Array<{ id: string; resource_id: string; status: string }>>(
        `/projects/${projectId}/approvals`
      );
      const approval = approvals?.find((a) => a.resource_id === batchId && a.status === "pending");
      if (approval) {
        await apiFetch(`/approvals/${approval.id}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: "User rejected" })
        });
        await loadState(projectId);
      }
    },
    [projectId, loadState]
  );

  const handleSendBatch = useCallback(
    async (batchId: string) => {
      if (!projectId) return;
      await apiFetch(`/projects/${projectId}/execution/email-batch/${batchId}/send`, {
        method: "POST"
      });
      await loadState(projectId);
    },
    [projectId, loadState]
  );

  // Computed values
  const pendingBatches = useMemo(
    () => state.batches.filter((b) => b.status === "pending_approval"),
    [state.batches]
  );

  const completedTasks = useMemo(
    () => state.tasks.filter((t) => t.status === "completed" || t.status === "succeeded").length,
    [state.tasks]
  );

  const selectedPlan = useMemo(
    () => pageState.activeTab === "plans" && pageState.selectedItemId
      ? state.plans.find((p) => p.id === pageState.selectedItemId) || null
      : null,
    [pageState.activeTab, pageState.selectedItemId, state.plans]
  );

  const selectedAsset = useMemo(
    () => pageState.activeTab === "assets" && pageState.selectedItemId
      ? state.assets.find((a) => a.id === pageState.selectedItemId) || null
      : null,
    [pageState.activeTab, pageState.selectedItemId, state.assets]
  );

  const selectedBatch = useMemo(
    () => pageState.activeTab === "outreach" && pageState.outreachSubTab === "batches" && pageState.selectedItemId
      ? state.batches.find((b) => b.id === pageState.selectedItemId) || null
      : null,
    [pageState.activeTab, pageState.outreachSubTab, pageState.selectedItemId, state.batches]
  );

  const previewContact = useMemo(
    () => previewingEmail?.contact_id
      ? state.contacts.find((c) => c.id === previewingEmail.contact_id) || null
      : null,
    [previewingEmail, state.contacts]
  );

  // Context-aware quick actions based on current state
  const quickActions = useMemo(() => {
    const actions = [];

    // Always offer plan creation if none exists
    if (state.plans.length === 0) {
      actions.push({
        label: "Create a 7-day launch plan",
        message: "Create a comprehensive 7-day execution plan for launch with daily tasks and milestones"
      });
    }

    // Offer asset generation
    if (state.assets.length === 0) {
      actions.push({
        label: "Generate email + image ad prompt",
        message: "Generate email copy and a detailed image ad generation prompt for this launch"
      });
    } else {
      actions.push({
        label: "Generate more email + image prompts",
        message: "Generate additional email copy and image ad prompt variations"
      });
    }

    // Offer outreach if contacts exist
    if (state.contacts.length > 0 && pendingBatches.length === 0) {
      actions.push({
        label: "Prepare email outreach",
        message: "Create personalized email batch for all contacts"
      });
    } else if (state.contacts.length === 0) {
      actions.push({
        label: "Set up outreach contacts",
        message: "Help me add and organize my outreach contact list"
      });
    }

    return actions;
  }, [state.plans.length, state.assets.length, state.contacts.length, pendingBatches.length]);

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
    <div className="flex h-[calc(100vh-140px)] flex-col animate-fade-in">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Execution</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Execute your launch with AI assistance
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          {pendingBatches.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
              <span className="flex h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs font-medium text-amber-400">
                {pendingBatches.length} pending approval
              </span>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-fg-muted">
            <span>{state.tasks.length > 0 && `${completedTasks}/${state.tasks.length} tasks`}</span>
            <span>{state.assets.length} assets</span>
            <span>{state.contacts.length} contacts</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main Layout - Chat on left, Actions on right */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat Panel (Left - 40%) */}
        <div className="flex w-2/5 min-w-[340px] flex-col overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
          <AgentChat
            agentName="Execution Agent"
            agentDescription="Plan, create, and execute your launch"
            placeholder="Ask me to create plans, generate assets, or prepare outreach..."
            onSend={handleSend}
            isProcessing={runningAction !== null}
            messages={chatMessages}
            onMessagesChange={saveChatMessages}
            quickActions={quickActions}
          />
        </div>

        {/* Action Panel (Right - 60%) */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-edge-subtle bg-surface-subtle/50 px-4 py-2">
            <ExecutionTabs
              activeTab={pageState.activeTab}
              onTabChange={(tab) =>
                setPageState((s) => ({
                  ...s,
                  activeTab: tab,
                  selectedItemId: null
                }))
              }
              counts={{
                plans: state.plans.length,
                assets: state.assets.length,
                contacts: state.contacts.length,
                pendingBatches: pendingBatches.length
              }}
            />
            {pageState.activeTab === "assets" && (
              <button
                onClick={handleGenerateImageAdDraft}
                disabled={runningAction !== null}
                className="ml-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Generate Image Ad Prompt
              </button>
            )}
          </div>

          {/* Content Area - List + Detail */}
          <div className="flex flex-1 overflow-hidden">
            {/* List Panel */}
            <div className="w-2/5 min-w-[200px] overflow-hidden border-r border-edge-subtle bg-surface-subtle/30">
              {pageState.activeTab === "outreach" && (
                <div className="flex h-full flex-col">
                  <OutreachSubTabs
                    activeTab={pageState.outreachSubTab}
                    onTabChange={(tab) =>
                      setPageState((s) => ({
                        ...s,
                        outreachSubTab: tab,
                        selectedItemId: null
                      }))
                    }
                    contactCount={state.contacts.length}
                    batchCount={state.batches.length}
                    pendingCount={pendingBatches.length}
                  />
                  <div className="flex-1 overflow-hidden">
                    {pageState.outreachSubTab === "contacts" ? (
                      <ContactsList
                        contacts={state.contacts}
                        selectedContactId={pageState.selectedItemId}
                        onSelectContact={(id) =>
                          setPageState((s) => ({ ...s, selectedItemId: id }))
                        }
                        onAddContact={handleAddContact}
                        onDeleteContact={handleDeleteContact}
                      />
                    ) : (
                      <BatchesList
                        batches={state.batches}
                        messages={state.messages}
                        selectedBatchId={pageState.selectedItemId}
                        onSelectBatch={(id) =>
                          setPageState((s) => ({ ...s, selectedItemId: id }))
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {pageState.activeTab === "assets" && (
                <AssetsList
                  assets={state.assets}
                  selectedAssetId={pageState.selectedItemId}
                  onSelectAsset={(id) =>
                    setPageState((s) => ({ ...s, selectedItemId: id }))
                  }
                />
              )}

              {pageState.activeTab === "plans" && (
                <PlansList
                  plans={state.plans}
                  tasks={state.tasks}
                  selectedPlanId={pageState.selectedItemId}
                  onSelectPlan={(id) =>
                    setPageState((s) => ({ ...s, selectedItemId: id }))
                  }
                />
              )}
            </div>

            {/* Detail Panel */}
            <div className="flex-1 overflow-hidden">
              {/* Outreach detail */}
              {pageState.activeTab === "outreach" && (
                pageState.outreachSubTab === "batches" ? (
                  selectedBatch ? (
                    <BatchDetail
                      batch={selectedBatch}
                      messages={state.messages}
                      contacts={state.contacts}
                      onApprove={handleApproveBatch}
                      onReject={handleRejectBatch}
                      onSend={handleSendBatch}
                      onPreviewEmail={(message) => setPreviewingEmail(message)}
                    />
                  ) : (
                    <EmptyDetailPanel
                      icon={
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                      title={state.batches.length === 0 ? "No email batches yet" : "Select a batch"}
                      description={state.batches.length === 0
                        ? "Ask the agent to prepare outreach emails"
                        : "Choose a batch to review and approve"
                      }
                    />
                  )
                ) : (
                  pageState.selectedItemId ? (
                    <ContactDetailView
                      contact={state.contacts.find((c) => c.id === pageState.selectedItemId) || null}
                      onEdit={() => {
                        const contact = state.contacts.find((c) => c.id === pageState.selectedItemId);
                        if (contact) setEditingContact(contact);
                      }}
                      onDelete={handleDeleteContact}
                    />
                  ) : (
                    <EmptyDetailPanel
                      icon={
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      }
                      title="Select a contact"
                      description="Choose a contact to view details"
                    />
                  )
                )
              )}

              {/* Assets detail */}
              {pageState.activeTab === "assets" && (
                selectedAsset ? (
                  <AssetDetail
                    asset={selectedAsset}
                    onSave={handleSaveAsset}
                    onStatusChange={handleAssetStatusChange}
                    onDelete={handleDeleteAsset}
                  />
                ) : (
                  <EmptyDetailPanel
                    icon={
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                    title={state.assets.length === 0 ? "No assets yet" : "Select an asset"}
                    description={state.assets.length === 0
                      ? "Ask the agent to generate marketing content"
                      : "Choose an asset to view and edit"
                    }
                  />
                )
              )}

              {/* Plans detail */}
              {pageState.activeTab === "plans" && (
                selectedPlan ? (
                  <PlanDetail
                    plan={selectedPlan}
                    tasks={state.tasks}
                    onTaskClick={(task) => setEditingTask(task)}
                    onTaskToggle={handleToggleTask}
                  />
                ) : (
                  <EmptyDetailPanel
                    icon={
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                    title={state.plans.length === 0 ? "No launch plan yet" : "Select a plan"}
                    description={state.plans.length === 0
                      ? "Ask the agent to create a 7-day launch plan"
                      : "Choose a plan to view the task board"
                    }
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        task={editingTask}
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
        onToggleComplete={handleToggleTask}
      />

      {/* Contact Drawer */}
      <ContactDrawer
        contact={editingContact}
        isOpen={editingContact !== null}
        onClose={() => setEditingContact(null)}
        onSave={handleSaveContact}
        onDelete={handleDeleteContact}
      />

      {/* Email Preview Modal */}
      <EmailPreviewModal
        message={previewingEmail}
        contact={previewContact}
        isOpen={previewingEmail !== null}
        onClose={() => setPreviewingEmail(null)}
      />
    </div>
  );
}

function EmptyDetailPanel({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated text-fg-faint">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-fg-primary">{title}</h3>
      <p className="mt-1 text-xs text-fg-muted">{description}</p>
    </div>
  );
}

function ContactDetailView({
  contact,
  onEdit,
  onDelete
}: {
  contact: Contact | null;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [contact?.id]);

  if (!contact) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-edge-subtle px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-purple-500 text-lg font-semibold text-white">
            {(contact.name || contact.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-fg-primary">
              {contact.name || contact.email}
            </h2>
            {contact.name && (
              <p className="truncate text-sm text-fg-muted">{contact.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          {!showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-red-500/30 p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {showDeleteConfirm && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-400">
                Delete "{contact.name || contact.email}"?
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                This action cannot be undone. The contact and its outreach references will be removed.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onDelete(contact.id)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                >
                  Yes, delete contact
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-edge-subtle bg-surface-muted px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-elevated"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-edge-subtle bg-surface-elevated p-4">
            <span className="text-sm text-fg-muted">Email</span>
            <span className="max-w-[70%] break-all text-right font-mono text-sm text-fg-primary">{contact.email}</span>
          </div>
          {contact.company && (
            <div className="flex items-center justify-between rounded-lg border border-edge-subtle bg-surface-elevated p-4">
              <span className="text-sm text-fg-muted">Company</span>
              <span className="max-w-[70%] truncate text-sm text-fg-primary">{contact.company}</span>
            </div>
          )}
          {contact.segment && (
            <div className="flex items-center justify-between rounded-lg border border-edge-subtle bg-surface-elevated p-4">
              <span className="text-sm text-fg-muted">Segment</span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {contact.segment}
              </span>
            </div>
          )}
          {contact.source && (
            <div className="flex items-center justify-between rounded-lg border border-edge-subtle bg-surface-elevated p-4">
              <span className="text-sm text-fg-muted">Source</span>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-fg-secondary">
                {contact.source}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
