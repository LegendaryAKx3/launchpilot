"use client";

import { cn } from "@/lib/utils";

interface ActionCardProps {
  title: string;
  description: string;
  status: "pending" | "ready";
  onApprove: () => Promise<void>;
  onReject?: () => Promise<void>;
  loading?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
}

export function ActionCard({
  title,
  description,
  status,
  onApprove,
  onReject,
  loading,
  approveLabel = "Approve",
  rejectLabel = "Reject"
}: ActionCardProps) {
  const isPending = status === "pending";

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        isPending
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
          : "border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
            isPending ? "bg-amber-500/20" : "bg-accent/20"
          )}
        >
          {isPending ? (
            <svg
              className="h-6 w-6 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6 text-accent"
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

        {/* Content */}
        <div className="flex-1">
          <h4 className={cn("font-semibold", isPending ? "text-amber-400" : "text-accent")}>
            {title}
          </h4>
          <p className="mt-1 text-sm text-fg-muted">{description}</p>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onApprove}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50",
                isPending
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-accent hover:bg-accent-hover"
              )}
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {approveLabel}
            </button>

            {onReject && (
              <button
                onClick={onReject}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                {rejectLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
