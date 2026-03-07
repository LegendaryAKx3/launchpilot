import { ApprovalCard } from "@/components/execution/approval-card";

export default function ApprovalsPage() {
  const approvals = [
    {
      action_type: "send_email_batch",
      status: "pending",
      reason: "Send first 10 contacts",
      required_scope: "execution:send"
    },
    {
      action_type: "publish_asset",
      status: "approved",
      reason: "Select image ad for launch",
      required_scope: "creative:publish"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h2 className="text-xl font-bold text-fg-primary">Approvals</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Sensitive actions require explicit approval and step-up auth.
        </p>
      </header>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-400">Step-up authentication required</p>
            <p className="mt-1 text-sm text-fg-muted">
              Some actions below require additional verification before they can be executed.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 stagger">
        {approvals.map((approval, idx) => (
          <div key={`${approval.action_type}-${idx}`} className="animate-slide-up" style={{ animationDelay: `${idx * 75}ms` }}>
            <ApprovalCard approval={approval} />
          </div>
        ))}
      </div>
    </div>
  );
}
