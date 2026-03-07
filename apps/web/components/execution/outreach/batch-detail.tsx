"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { OutboundBatch, OutboundMessage } from "./batches-list";
import { ActionCard } from "./action-card";
import { Contact } from "./contacts-list";

interface BatchDetailProps {
  batch: OutboundBatch;
  messages: OutboundMessage[];
  contacts: Contact[];
  onApprove: (batchId: string) => Promise<void>;
  onReject: (batchId: string) => Promise<void>;
  onSend: (batchId: string) => Promise<void>;
  onPreviewEmail: (message: OutboundMessage) => void;
}

export function BatchDetail({
  batch,
  messages,
  contacts,
  onApprove,
  onReject,
  onSend,
  onPreviewEmail
}: BatchDetailProps) {
  const [processing, setProcessing] = useState(false);

  const batchMessages = messages.filter((m) => m.batch_id === batch.id);
  const isPending = batch.status === "pending_approval";
  const isApproved = batch.status === "approved";
  const isSent = batch.status === "sent";

  const getContact = (contactId?: string) => {
    if (!contactId) return null;
    return contacts.find((c) => c.id === contactId);
  };

  const handleApprove = useCallback(async () => {
    setProcessing(true);
    try {
      await onApprove(batch.id);
    } finally {
      setProcessing(false);
    }
  }, [batch.id, onApprove]);

  const handleReject = useCallback(async () => {
    setProcessing(true);
    try {
      await onReject(batch.id);
    } finally {
      setProcessing(false);
    }
  }, [batch.id, onReject]);

  const handleSend = useCallback(async () => {
    setProcessing(true);
    try {
      await onSend(batch.id);
    } finally {
      setProcessing(false);
    }
  }, [batch.id, onSend]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-edge-subtle px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-fg-primary">
              {batch.subject_line || `Email Batch`}
            </h2>
            <StatusBadge
              status={
                isPending
                  ? "pending"
                  : isApproved
                    ? "approved"
                    : isSent
                      ? "succeeded"
                      : batch.status
              }
            />
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {batchMessages.length} email{batchMessages.length !== 1 ? "s" : ""} in this batch
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Inline Action Card for pending batches */}
        {isPending && (
          <ActionCard
            title="Approve Email Batch"
            description={`This batch contains ${batchMessages.length} personalized emails ready to be sent. Review the emails below and approve to proceed.`}
            status="pending"
            onApprove={handleApprove}
            onReject={handleReject}
            loading={processing}
          />
        )}

        {/* Send button for approved batches */}
        {isApproved && !isSent && (
          <ActionCard
            title="Send Email Batch"
            description="This batch has been approved. Click the button below to send all emails."
            status="ready"
            approveLabel="Send Emails"
            onApprove={handleSend}
            loading={processing}
          />
        )}

        {/* Sent confirmation */}
        {isSent && (
          <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-emerald-400">Batch Sent Successfully</p>
              <p className="text-sm text-fg-muted">
                {batch.sent_at
                  ? `Sent on ${new Date(batch.sent_at).toLocaleString()}`
                  : "All emails have been sent"}
              </p>
            </div>
          </div>
        )}

        {/* Email list */}
        <div>
          <h3 className="mb-4 text-sm font-semibold text-fg-primary">
            Emails in Batch
          </h3>
          <div className="space-y-3">
            {batchMessages.map((message) => {
              const contact = getContact(message.contact_id);
              const isMsgSent = message.status === "sent";
              const hasFailed = message.status === "failed";

              return (
                <div
                  key={message.id}
                  onClick={() => onPreviewEmail(message)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm",
                    isMsgSent
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : hasFailed
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-edge-subtle bg-surface-elevated hover:border-edge-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-purple-500 text-sm font-medium text-white">
                        {(contact?.name || contact?.email || "?").charAt(0).toUpperCase()}
                      </div>

                      {/* Contact info */}
                      <div>
                        <p className="text-sm font-medium text-fg-primary">
                          {contact?.name || contact?.email || "Unknown"}
                        </p>
                        {contact?.name && (
                          <p className="text-xs text-fg-muted">{contact.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge
                      status={
                        isMsgSent
                          ? "succeeded"
                          : hasFailed
                            ? "failed"
                            : "draft"
                      }
                    />
                  </div>

                  {/* Subject preview */}
                  {message.subject && (
                    <p className="mt-3 text-sm text-fg-secondary truncate">
                      <span className="text-fg-muted">Subject:</span> {message.subject}
                    </p>
                  )}

                  {/* Error message */}
                  {hasFailed && message.error_message && (
                    <p className="mt-2 text-xs text-red-400">
                      Error: {message.error_message}
                    </p>
                  )}

                  {/* Preview indicator */}
                  <div className="mt-3 flex items-center gap-1 text-xs text-accent">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Click to preview
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
