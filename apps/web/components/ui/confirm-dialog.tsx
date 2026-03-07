"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  label: string;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  label,
  onConfirm,
  title = "Confirm action",
  description = "This action may trigger a sensitive workflow. Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  variant = "default"
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          variant === "destructive"
            ? "border border-red-500/30 text-red-400 hover:bg-red-500/10"
            : "border border-edge-subtle text-fg-secondary hover:bg-surface-elevated"
        )}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md animate-scale-in rounded-xl border border-edge-subtle bg-surface-elevated p-6 shadow-2xl">
            {/* Icon */}
            <div
              className={cn(
                "mb-4 flex h-10 w-10 items-center justify-center rounded-full",
                variant === "destructive"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-accent/10 text-accent"
              )}
            >
              {variant === "destructive" ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            <h4 className="text-lg font-semibold text-fg-primary">{title}</h4>
            <p className="mt-2 text-sm text-fg-muted">{description}</p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-overlay"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                  variant === "destructive"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-accent hover:bg-accent-hover"
                )}
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
