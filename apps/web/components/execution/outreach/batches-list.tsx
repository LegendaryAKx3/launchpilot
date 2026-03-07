"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

export interface OutboundBatch {
  id: string;
  status: string;
  subject_line?: string;
  send_count?: number;
  approved_at?: string;
  sent_at?: string;
}

export interface OutboundMessage {
  id: string;
  batch_id: string;
  contact_id?: string;
  status: string;
  subject?: string;
  body?: string;
  error_message?: string;
}

interface BatchesListProps {
  batches: OutboundBatch[];
  messages: OutboundMessage[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string | null) => void;
}

export function BatchesList({
  batches,
  messages,
  selectedBatchId,
  onSelectBatch
}: BatchesListProps) {
  const getMessageCount = (batchId: string) => {
    return messages.filter((m) => m.batch_id === batchId).length;
  };

  const getSentCount = (batchId: string) => {
    return messages.filter((m) => m.batch_id === batchId && m.status === "sent").length;
  };

  if (batches.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
          <svg className="h-8 w-8 text-fg-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-fg-primary">No email batches yet</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Use the chat to prepare personalized outreach emails
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-edge-subtle px-4 py-3">
        <h3 className="text-sm font-semibold text-fg-primary">Email Batches</h3>
        <p className="mt-0.5 text-xs text-fg-muted">
          {batches.length} batch{batches.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* Batches list */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {batches.map((batch) => {
            const messageCount = getMessageCount(batch.id);
            const sentCount = getSentCount(batch.id);
            const isPending = batch.status === "pending_approval";
            const isSent = batch.status === "sent";

            return (
              <button
                key={batch.id}
                onClick={() => onSelectBatch(selectedBatchId === batch.id ? null : batch.id)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all",
                  selectedBatchId === batch.id
                    ? "border-accent bg-accent/5 shadow-sm"
                    : isPending
                      ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                      : "border-edge-subtle bg-surface-elevated hover:border-edge-muted"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg-primary truncate">
                        {batch.subject_line || `Batch ${batch.id.slice(0, 8)}`}
                      </span>
                      <StatusBadge
                        status={
                          isPending
                            ? "pending"
                            : isSent
                              ? "succeeded"
                              : batch.status
                        }
                      />
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-fg-muted">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {messageCount} emails
                      </span>
                      {isSent && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {sentCount} sent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pending indicator */}
                  {isPending && (
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                      <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                {(batch.approved_at || batch.sent_at) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-fg-faint">
                    {batch.approved_at && (
                      <span>
                        Approved: {new Date(batch.approved_at).toLocaleDateString()}
                      </span>
                    )}
                    {batch.sent_at && (
                      <span>
                        Sent: {new Date(batch.sent_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
