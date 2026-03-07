import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

interface Approval {
  action_type: string;
  status: string;
  reason?: string;
  required_scope?: string;
}

export function ApprovalCard({ approval }: { approval: Approval }) {
  const isApproved = approval.status === "approved";
  const isRejected = approval.status === "rejected";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        isApproved && "border-emerald-500/30 bg-emerald-500/5",
        isRejected && "border-red-500/30 bg-red-500/5",
        !isApproved && !isRejected && "border-edge-subtle bg-surface-muted hover:border-edge-muted"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isApproved && "bg-emerald-500/20 text-emerald-400",
              isRejected && "bg-red-500/20 text-red-400",
              !isApproved && !isRejected && "bg-surface-elevated text-fg-muted"
            )}
          >
            {isApproved ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : isRejected ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            )}
          </div>
          <p className="font-medium text-fg-primary">{approval.action_type}</p>
        </div>
        <StatusBadge status={approval.status} />
      </div>

      {approval.reason && (
        <p className="mt-3 text-sm text-fg-muted">{approval.reason}</p>
      )}

      {approval.required_scope && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-fg-faint">Required scope:</span>
          <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-accent">
            {approval.required_scope}
          </code>
        </div>
      )}
    </div>
  );
}
