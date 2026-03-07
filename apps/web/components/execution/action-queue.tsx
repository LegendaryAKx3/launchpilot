import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

interface ActionItem {
  title: string;
  status: string;
  reason?: string;
}

export function ActionQueue({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-edge-subtle bg-surface-subtle/50 p-6 text-center">
        <p className="text-sm text-fg-muted">No pending actions.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical timeline line */}
      <div className="absolute bottom-4 left-[11px] top-4 w-0.5 bg-edge-subtle" />

      {items.map((item, index) => (
        <div
          key={item.title}
          className="relative flex gap-4 py-3 animate-slide-up"
          style={{ animationDelay: `${index * 75}ms` }}
        >
          {/* Status dot */}
          <div
            className={cn(
              "relative z-10 mt-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2",
              item.status === "pending" && "border-amber-400 bg-surface-muted",
              item.status === "running" && "border-blue-400 bg-blue-400/20",
              (item.status === "completed" || item.status === "succeeded") &&
                "border-emerald-400 bg-emerald-400"
            )}
          >
            {(item.status === "completed" || item.status === "succeeded") && (
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {item.status === "running" && (
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 rounded-xl border border-edge-subtle bg-surface-muted p-4 transition-colors hover:border-edge-muted">
            <div className="flex items-center justify-between">
              <p className="font-medium text-fg-primary">{item.title}</p>
              <StatusBadge status={item.status} />
            </div>
            {item.reason && (
              <p className="mt-2 text-sm text-fg-muted">{item.reason}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
