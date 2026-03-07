"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { OutboundMessage } from "./batches-list";
import { Contact } from "./contacts-list";

interface EmailPreviewModalProps {
  message: OutboundMessage | null;
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmailPreviewModal({ message, contact, isOpen, onClose }: EmailPreviewModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const isSent = message.status === "sent";
  const hasFailed = message.status === "failed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl animate-scale-in rounded-xl border border-edge-subtle bg-surface-elevated shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-edge-subtle p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-purple-500 text-lg font-semibold text-white">
              {(contact?.name || contact?.email || "?").charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="font-semibold text-fg-primary">
                {contact?.name || contact?.email || "Unknown Recipient"}
              </p>
              {contact?.name && (
                <p className="text-sm text-fg-muted">{contact.email}</p>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                isSent
                  ? "bg-emerald-500/10 text-emerald-400"
                  : hasFailed
                    ? "bg-red-500/10 text-red-400"
                    : "bg-surface-muted text-fg-muted"
              )}
            >
              {isSent ? "Sent" : hasFailed ? "Failed" : "Draft"}
            </span>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-overlay hover:text-fg-primary"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error message if failed */}
        {hasFailed && message.error_message && (
          <div className="border-b border-red-500/30 bg-red-500/5 px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {message.error_message}
            </div>
          </div>
        )}

        {/* Email content */}
        <div className="p-6">
          {/* Subject */}
          <div className="mb-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-faint">
              Subject
            </p>
            <p className="text-lg font-medium text-fg-primary">
              {message.subject || "(No subject)"}
            </p>
          </div>

          {/* Body */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-faint">
              Body
            </p>
            <div className="rounded-lg border border-edge-subtle bg-surface-muted p-4">
              {message.body ? (
                <div className="whitespace-pre-wrap text-sm text-fg-secondary">
                  {message.body}
                </div>
              ) : (
                <p className="text-sm text-fg-muted italic">No body content</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-edge-subtle bg-surface-subtle/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
